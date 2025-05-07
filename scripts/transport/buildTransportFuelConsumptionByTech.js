import { parseCsv, loadTemplate, splitTechnology } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Transport");

// ορισμός των mode και corresponding Type strings
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
  const [prodRows, techListRows, inputActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
  ]);
  return { prodRows, techListRows, inputActRows };
}

// pivot InputActivityRatio into { [TECHNOLOGY]: { [year]: ratio } }
function pivotByTechnology(rows) {
  const map = {};
  rows.forEach((r) => {
    map[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([col, val]) => {
      if (/^[0-9]{4}$/.test(col)) {
        map[r.TECHNOLOGY][col] = Number(val);
      }
    });
  });
  return map;
}

export async function buildTransportFuelConsumptionByTechChart() {
  // 1) Ensure output directory exists
  await fs.mkdir(OUT_DIR, { recursive: true });

  // 2) Load CSV data
  const { prodRows, techListRows, inputActRows } = await loadCsvs();

  // 3) Filter only Transport technologies, build code→type map
  const transportList = techListRows.filter(
    (r) => r["Sub-module"] === "Transport"
  );
  const techToType = {};
  transportList.forEach((r) => {
    techToType[r["Technology code"]] = r.Type;
  });

  // 4) Separate codes into passenger and freight groups
  const passengerCodes = transportList
    .filter((r) => TYPES.passenger.includes(r.Type))
    .map((r) => r["Technology code"]);
  const freightCodes = transportList
    .filter((r) => TYPES.freight.includes(r.Type))
    .map((r) => r["Technology code"]);

  // 5) Pivot InputActivityRatio by full TECHNOLOGY (no prefix filtering)
  const inputMap = pivotByTechnology(inputActRows);

  // 6) Aggregate passenger consumption: km × ratio → PJ
  const passengerAgg = {}; // { [tech]: { [year]: PJ } }
  prodRows
    .filter(
      (r) => r.FUEL.endsWith("KM") && passengerCodes.includes(r.TECHNOLOGY)
    )
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const year = r.YEAR;
      const km = +r.VALUE;
      const ratio = inputMap[tech]?.[year] || 0; // look up by full tech code
      const pj = km * ratio;
      passengerAgg[tech] ??= {};
      passengerAgg[tech][year] = (passengerAgg[tech][year] || 0) + pj;
    });

  // 7) Aggregate freight consumption: km × ratio → PJ
  const freightAgg = {};
  prodRows
    .filter((r) => r.FUEL.endsWith("KM") && freightCodes.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const year = r.YEAR;
      const km = +r.VALUE;
      const ratio = inputMap[tech]?.[year] || 0;
      const pj = km * ratio;
      freightAgg[tech] ??= {};
      freightAgg[tech][year] = (freightAgg[tech][year] || 0) + pj;
    });

  // 8) Build unified years axis
  const allYears = Array.from(
    new Set(
      [
        ...Object.values(passengerAgg).flatMap(Object.keys),
        ...Object.values(freightAgg).flatMap(Object.keys),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  // 9) Assemble series per technology
  const passengerSeries = passengerCodes.map((tech) => ({
    name: tech,
    type: "column",
    data: allYears.map((y) => passengerAgg[tech]?.[y] || 0),
  }));
  const freightSeries = freightCodes.map((tech) => ({
    name: tech,
    type: "column",
    data: allYears.map((y) => freightAgg[tech]?.[y] || 0),
  }));

  // 10) Write Passenger chart config
  const tpl1 = await loadTemplate("stackedBar");
  const cfg1 = merge({}, tpl1, {
    title: { text: "Annual Fuel Consumption – Passenger Transport" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Fuel Consumption (PJ)" } },
    series: passengerSeries,
  });
  await fs.writeFile(
    path.join(OUT_DIR, "transport-fuel-consumption-passenger-tech.config.json"),
    JSON.stringify(cfg1, null, 2)
  );

  // 11) Write Freight chart config
  const tpl2 = await loadTemplate("stackedBar");
  const cfg2 = merge({}, tpl2, {
    title: { text: "Annual Fuel Consumption – Freight Transport" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Fuel Consumption (PJ)" } },
    series: freightSeries,
  });
  await fs.writeFile(
    path.join(OUT_DIR, "transport-fuel-consumption-freight-tech.config.json"),
    JSON.stringify(cfg2, null, 2)
  );

  console.log("Wrote passenger & freight fuel consumption by tech charts");
}
