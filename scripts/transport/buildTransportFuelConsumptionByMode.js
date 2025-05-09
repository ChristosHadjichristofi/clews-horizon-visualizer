import { parseCsv, loadTemplate } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Transport");

// which Types count as passenger vs freight
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

// map InputActivityRatio → { [TECH]: { [year]: PJ_per_km } }
function pivotByTechnology(rows) {
  const m = {};
  rows.forEach((r) => {
    m[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([k, v]) => {
      if (/^\d{4}$/.test(k)) m[r.TECHNOLOGY][k] = Number(v);
    });
  });
  return m;
}

export async function buildTransportFuelConsumptionByModeChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, techListRows, inputActRows } = await loadCsvs();

  // 1) build tech→mode and tech→type maps
  const techToMode = {};
  const techToType = {};
  techListRows
    .filter((r) => r["Sub-module"] === "Transport")
    .forEach((r) => {
      techToType[r["Technology code"]] = r.Type;
      if (TYPES.passenger.includes(r.Type)) {
        techToMode[r["Technology code"]] = "passenger";
      } else if (TYPES.freight.includes(r.Type)) {
        techToMode[r["Technology code"]] = "freight";
      }
    });

  // 2) pivot input ratios
  const inputMap = pivotByTechnology(inputActRows);

  // 3) accumulate PJ by mode→type→year
  const consumption = {
    passenger: {},
    freight: {},
    transport: {},
  };

  prodRows
    .filter((r) => r.FUEL.endsWith("KM") && techToMode[r.TECHNOLOGY])
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const mode = techToMode[tech]; // "passenger" / "freight"
      const typeName = techToType[tech]; // e.g. "Passenger road - vehicles"
      const year = r.YEAR;
      const km = +r.VALUE;
      const pj = km * (inputMap[tech]?.[year] || 0);

      // by‐mode→type
      consumption[mode][typeName] ??= {};
      consumption[mode][typeName][year] =
        (consumption[mode][typeName][year] || 0) + pj;

      // also accumulate into the "all transport" bucket
      consumption.transport[typeName] ??= {};
      consumption.transport[typeName][year] =
        (consumption.transport[typeName][year] || 0) + pj;
    });

  // 4) build sorted years axis
  const allYears = Array.from(
    new Set(
      Object.values(consumption)
        .flatMap((modes) => Object.values(modes))
        .flatMap((byType) => Object.keys(byType))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // 5) write one stackedBar per mode
  const tpl = await loadTemplate("stackedBar");

  for (const [modeKey, friendly] of [
    ["passenger", "Passenger Transport"],
    ["freight", "Freight Transport"],
    ["transport", "All Transport"],
  ]) {
    const byTypeMap = consumption[modeKey];
    const series = Object.entries(byTypeMap).map(([typeName, byYear]) => ({
      name: typeName,
      type: "column",
      data: allYears.map((y) => byYear[y] || 0),
    }));

    const cfg = merge({}, tpl, {
      title: { text: `Annual Fuel Consumption – ${friendly}` },
      xAxis: { categories: allYears, title: { text: "Year" } },
      yAxis: { title: { text: "Fuel Consumption (PJ)" } },
      series,
    });

    const fileName = `transport-fuel-consumption-${modeKey}.config.json`;
    await fs.writeFile(
      path.join(OUT_DIR, fileName),
      JSON.stringify(cfg, null, 2)
    );
    console.log("Wrote", fileName);
  }
}
