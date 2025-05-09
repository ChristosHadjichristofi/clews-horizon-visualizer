import {
  parseCsv,
  loadTemplate,
  splitTechnology,
  annotateTechSeries,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Buildings");

/** Pivot InputActivityRatio into { [TECH]: { [year]: PJ_per_unit } } */
function pivotByTechnology(rows) {
  const map = {};
  rows.forEach((r) => {
    map[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([col, val]) => {
      if (/^\d{4}$/.test(col)) map[r.TECHNOLOGY][col] = Number(val);
    });
  });
  return map;
}

export async function buildBuildingsFinalEnergyDemandByFuelChart() {
  // 1) Ensure output dir
  await fs.mkdir(OUT_DIR, { recursive: true });

  // 2) Load CSVs
  const [prodRows, techListRows, inputActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
  ]);

  // 3) Identify all Buildings tech codes (tech !== "000")
  const buildingTechs = techListRows
    .filter((r) => r["Sub-module"] === "Buildings")
    .map((r) => r["Technology code"])
    .filter((tech) => splitTechnology(tech).tech !== "000");

  // 4) Pivot input ratios
  const inputMap = pivotByTechnology(inputActRows);

  // 5) Accumulate demandPJ by techSuffix → year
  const demand = {}; // { [techSuffix]: { [year]: PJ } }
  prodRows
    .filter((r) => buildingTechs.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const year = r.YEAR;
      const techSuffix = splitTechnology(r.TECHNOLOGY).tech;
      const ratio = inputMap[r.TECHNOLOGY]?.[year] || 0;
      const pj = Number(r.VALUE) * ratio;

      demand[techSuffix] ??= {};
      demand[techSuffix][year] = (demand[techSuffix][year] || 0) + pj;
    });

  // 6) Build sorted years axis
  const years = Array.from(
    new Set(
      Object.values(demand)
        .flatMap((byYear) => Object.keys(byYear))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // 7) Build Highcharts series, dropping any tech with all zeros
  const series = Object.entries(demand)
    .map(([tech, byYear]) => ({
      name: tech,
      type: "column",
      data: years.map((y) => byYear[y] || 0),
    }))
    .filter((s) => s.data.some((v) => v !== 0));

  const annotatedSeries = await annotateTechSeries(series);

  // 8) Merge into stackedBar template & write config
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    title: { text: "Final‐Energy Demand by Fuel" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Demand (PJ)" } },
    series: annotatedSeries,
  });

  const fileName = "buildings-final-energy-demand-by-fuel.config.json";
  await fs.writeFile(
    path.join(OUT_DIR, fileName),
    JSON.stringify(cfg, null, 2)
  );
  console.log("Wrote", fileName);
}
