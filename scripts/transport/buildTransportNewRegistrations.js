import {
  parseCsv,
  loadTemplate,
  annotateTechSeries,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Transport");

// same four road‐transport types as before
const TYPES = [
  "Passenger road - vehicles",
  "Passenger road - bus",
  "Freight road - light trucks",
  "Freight road - heavy trucks",
];

async function loadCsvs() {
  const [newRows, techListRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "NewCapacity.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
  ]);
  return { newRows, techListRows };
}

export async function buildTransportNewRegistrationsChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const { newRows, techListRows } = await loadCsvs();

  // 1) pick only the road‐transport tech codes
  const transportTechs = techListRows
    .filter((r) => TYPES.includes(r.Type))
    .map((r) => r["Technology code"]);

  // 2) aggregate new registrations by tech & year
  const agg = {};
  newRows
    .filter((r) => transportTechs.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const year = r.YEAR;
      const val = +r.VALUE;
      agg[tech] ??= {};
      agg[tech][year] = (agg[tech][year] || 0) + val;
    });

  // 3) build unified year axis
  const years = Array.from(
    new Set(Object.values(agg).flatMap(Object.keys).map(Number))
  ).sort((a, b) => a - b);

  // 4) build one column series per tech
  const series = transportTechs.map((code) => ({
    name: code,
    type: "column",
    data: years.map((y) => agg[code]?.[y] || 0),
  }));

  const annotatedSeries = await annotateTechSeries(series);

  // 5) merge into your stacked‐bar template
  const tpl = await loadTemplate("stackedBar");
  const config = merge({}, tpl, {
    title: { text: "New Vehicle Registrations by Technology – Road Transport" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Registrations (units)" } },
    series: annotatedSeries,
  });

  // 6) write out
  const outFile = path.join(OUT_DIR, "transport-new-registrations.config.json");
  await fs.writeFile(outFile, JSON.stringify(config, null, 2));
  console.log("Wrote", outFile);
}
