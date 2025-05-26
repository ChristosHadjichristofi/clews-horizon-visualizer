import { parseCsv, loadTemplate } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Transport");

const COLORS = {
  "Passenger road - vehicles": "#4e79a7",
  "Passenger road - bus": "#f28e2c",
  "Passenger rail": "#59a14f",
  Aviation: "#e15759",
  "Freight road - light trucks": "#edc949",
  "Freight road - heavy trucks": "#af7aa1",
  "Freight rail": "#76b7b2",
  "Shipping/Maritime": "#ff9da7",
};

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

  function aggregateDistance(set, label) {
    const agg = {};
    let skipped = 0;

    prodRows
      .filter((r) => r.FUEL.endsWith("KM") && set.has(r.TECHNOLOGY))
      .forEach((r) => {
        const year = r.YEAR;
        const tech = r.TECHNOLOGY;
        const km = +r.VALUE;
        const type = techToType[tech];

        if (!type || isNaN(km)) {
          skipped++;
          return;
        }

        const kmTotal = km * 1e9; // Convert billion km to raw km
        agg[type] ??= {};
        agg[type][year] = (agg[type][year] || 0) + kmTotal;
      });

    console.log(
      `[INFO] Aggregated ${label}: ${
        Object.keys(agg).length
      } types, skipped ${skipped} rows`
    );
    return agg;
  }

  const passengerAgg = aggregateDistance(passengerSet, "Passenger");
  const freightAgg = aggregateDistance(freightSet, "Freight");

  const allYears = Array.from(
    new Set(
      [
        ...Object.values(passengerAgg).flatMap((o) => Object.keys(o)),
        ...Object.values(freightAgg).flatMap((o) => Object.keys(o)),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  const passengerSeries = TYPES.passenger.map((type) => ({
    name: type,
    type: "column",
    color: COLORS[type],
    data: allYears.map((y) => passengerAgg[type]?.[y] || 0),
  }));

  const freightSeries = TYPES.freight.map((type) => ({
    name: type,
    type: "column",
    color: COLORS[type],
    data: allYears.map((y) => freightAgg[type]?.[y] || 0),
  }));

  const tpl1 = await loadTemplate("stackedBar");
  const config1 = merge({}, tpl1, {
    title: { text: "Total Distance – Passenger Transport" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Total km" } },
    series: passengerSeries,
  });
  await fs.writeFile(
    path.join(OUT_DIR, "transport-distance-total-passenger.config.json"),
    JSON.stringify(config1, null, 2)
  );

  const tpl2 = await loadTemplate("stackedBar");
  const config2 = merge({}, tpl2, {
    title: { text: "Total Distance – Freight Transport" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Total km" } },
    series: freightSeries,
  });
  await fs.writeFile(
    path.join(OUT_DIR, "transport-distance-total-freight.config.json"),
    JSON.stringify(config2, null, 2)
  );

  console.log("[DONE] Wrote total distance chart configs to:", OUT_DIR);
}
