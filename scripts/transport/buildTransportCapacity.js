import { parseCsv, loadTemplate } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Transport");

async function loadCsvs() {
  const [capacityRows, techListRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "TotalCapacityAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
  ]);
  //   console.log(
  //     `Loaded ${capacityRows.length} capacity rows and ${techListRows.length} tech list rows`
  //   );
  return { capacityRows, techListRows };
}

// Types to include
const TYPES = [
  "Passenger road - vehicles",
  "Passenger road - bus",
  "Freight road - light trucks",
  "Freight road - heavy trucks",
];

export async function buildTransportCapacityChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const { capacityRows, techListRows } = await loadCsvs();

  // 1) Filter tech list for desired types
  const transportTechs = techListRows
    .filter((r) => TYPES.includes(r.Type))
    .map((r) => r["Technology code"]);
  //   console.log(
  //     `Found ${transportTechs.length} transport technologies:`,
  //     transportTechs
  //   );

  // 2) Aggregate capacity by tech and year
  const agg = {};
  capacityRows
    .filter((r) => transportTechs.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const year = r.YEAR;
      const val = +r.VALUE;
      agg[tech] ??= {};
      agg[tech][year] = (agg[tech][year] || 0) + val;
    });
  //   console.log("Aggregated capacity:", agg);

  // 3) Build years axis
  const years = Array.from(
    new Set([...Object.values(agg).flatMap(Object.keys)].map(Number))
  ).sort((a, b) => a - b);

  // 4) Build series per technology
  const series = transportTechs.map((code) => ({
    name: code,
    type: "column",
    data: years.map((y) => agg[code]?.[y] || 0),
  }));

  // 5) Write chart config
  const tpl = await loadTemplate("stackedBar");
  const config = merge({}, tpl, {
    title: { text: "Vehicle Fleet Stock by Technology – Road Transport" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Capacity (units)" } },
    series,
  });

  const outFile = path.join(OUT_DIR, "transport-capacity-annual.config.json");
  await fs.writeFile(outFile, JSON.stringify(config, null, 2));
  console.log("Wrote", outFile);
}
