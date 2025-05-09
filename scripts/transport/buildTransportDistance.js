import { parseCsv, loadTemplate } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Transport");

const TYPES = {
  passenger: [
    "Passenger road - vehicles",
    "Passenger road - bus",
    "Passenger rail",
    "Aviation",
  ],
  freight: [
    "Freight road - light trucks",
    "Freight road - heavy trucks",
    "Freight rail",
    "Shipping/Maritime",
  ],
};

async function loadCsvs() {
  const [prodRows, techListRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
  ]);
  return { prodRows, techListRows };
}

export async function buildTransportDistanceChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, techListRows } = await loadCsvs();

  const transportList = techListRows.filter(
    (r) => r["Sub-module"] === "Transport"
  );

  const techToType = {};
  transportList.forEach((r) => {
    techToType[r["Technology code"]] = r.Type;
  });

  const passengerSet = new Set(
    transportList
      .filter((r) => TYPES.passenger.includes(r.Type))
      .map((r) => r["Technology code"])
  );
  const freightSet = new Set(
    transportList
      .filter((r) => TYPES.freight.includes(r.Type))
      .map((r) => r["Technology code"])
  );

  const passengerAgg = {};
  prodRows
    .filter((r) => r.FUEL.endsWith("KM") && passengerSet.has(r.TECHNOLOGY))
    .forEach((r) => {
      const year = r.YEAR;
      const km = +r.VALUE;
      const type = techToType[r.TECHNOLOGY];
      passengerAgg[type] ??= {};
      passengerAgg[type][year] = (passengerAgg[type][year] || 0) + km;
    });

  const freightAgg = {};
  prodRows
    .filter((r) => r.FUEL.endsWith("KM") && freightSet.has(r.TECHNOLOGY))
    .forEach((r) => {
      const year = r.YEAR;
      const km = +r.VALUE;
      const type = techToType[r.TECHNOLOGY];
      freightAgg[type] ??= {};
      freightAgg[type][year] = (freightAgg[type][year] || 0) + km;
    });

  const allYears = Array.from(
    new Set(
      [
        ...Object.values(passengerAgg).flatMap(Object.keys),
        ...Object.values(freightAgg).flatMap(Object.keys),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  const passengerSeries = TYPES.passenger.map((type) => ({
    name: type,
    type: "column",
    data: allYears.map((y) => passengerAgg[type]?.[y] || 0),
  }));

  const freightSeries = TYPES.freight.map((type) => ({
    name: type,
    type: "column",
    data: allYears.map((y) => freightAgg[type]?.[y] || 0),
  }));

  const tpl1 = await loadTemplate("stackedBar");
  const config1 = merge({}, tpl1, {
    title: { text: "Annual Distance Traveled – Passenger Transport" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Distance (km)" } },
    series: passengerSeries,
  });
  await fs.writeFile(
    path.join(OUT_DIR, "transport-distance-passenger.config.json"),
    JSON.stringify(config1, null, 2)
  );

  const tpl2 = await loadTemplate("stackedBar");
  const config2 = merge({}, tpl2, {
    title: { text: "Annual Distance Traveled – Freight Transport" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Distance (km)" } },
    series: freightSeries,
  });
  await fs.writeFile(
    path.join(OUT_DIR, "transport-distance-freight.config.json"),
    JSON.stringify(config2, null, 2)
  );

  console.log(
    "Wrote transport-distance-passenger.config.json and transport-distance-freight.config.json"
  );
}
