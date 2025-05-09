import fs from "fs/promises";
import path from "path";
import merge from "lodash.merge";
import { splitTechnology, parseCsv, loadTemplate } from "../utils/general.js";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Overarching");
const PJ_TO_TWH = 0.277778;

// load all required CSVs
async function loadCsvs() {
  const [prodRows, techListRows, inputActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
  ]);
  return { prodRows, techListRows, inputActRows };
}

// pivot InputActivityRatio → { TECH: { year: ratio } }
function pivotByTechnology(rows) {
  const map = {};
  rows.forEach((r) => {
    map[r.TECHNOLOGY] ??= {};
    for (const [col, val] of Object.entries(r)) {
      if (/^\d{4}$/.test(col)) map[r.TECHNOLOGY][col] = Number(val);
    }
  });
  return map;
}

export async function buildFinalEnergyDemandByFuelChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, techListRows, inputActRows } = await loadCsvs();

  // — ELECTRICITY DEMAND (PJ → TWh) —
  const demandTechs = techListRows
    .filter(
      (r) =>
        r["Input code"] === "EUEFEL" ||
        r["Output code"] === "EUEXEL" ||
        r["Output code"] === "EUEHY2"
    )
    .map((r) => r["Technology code"]);

  const inputMap = pivotByTechnology(inputActRows);
  const electricityDemand = {}; // { year: TWh }
  prodRows
    .filter((r) => demandTechs.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const year = String(r.YEAR);
      const ratio = inputMap[r.TECHNOLOGY]?.[year] || 0;
      const finalPJ = Number(r.VALUE) * ratio;
      electricityDemand[year] =
        (electricityDemand[year] || 0) + finalPJ * PJ_TO_TWH;
    });

  // — PS‐SUFFIX DEMAND BY TECH‐SUFFIX (PJ → TWh) —
  const psDemand = {}; // { suffix: { year: TWh } }
  prodRows
    .filter((r) => r.TECHNOLOGY.slice(8, 10) === "PS")
    .forEach((r) => {
      const { tech } = splitTechnology(r.TECHNOLOGY);
      const year = String(r.YEAR);
      const ratio = inputMap[r.TECHNOLOGY]?.[year] || 0;
      const finalPJ = Number(r.VALUE) * ratio;
      const tWh = finalPJ * PJ_TO_TWH;

      psDemand[tech] ??= {};
      psDemand[tech][year] = (psDemand[tech][year] || 0) + tWh;
    });

  // — BUILD YEARS AXIS —
  const years = Array.from(
    new Set([
      ...Object.keys(electricityDemand),
      ...Object.values(psDemand).flatMap((m) => Object.keys(m)),
    ])
  )
    .map(Number)
    .sort((a, b) => a - b)
    .map(String);

  // — ASSEMBLE SERIES (all columns, stacked) —
  const series = [
    // one *stacked* column per PS‐suffix
    ...Object.entries(psDemand).map(([suffix, byYear]) => ({
      name: suffix,
      type: "column",
      data: years.map((y) => byYear[y] || 0),
    })),
    // electricity demand as a *column* too
    {
      name: "Electricity Demand",
      type: "column",
      data: years.map((y) => electricityDemand[y] || 0),
    },
  ];

  // — RENDER & WRITE USING a stacked‐bar template —
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    title: { text: "Final-Energy Demand by Fuel" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Energy (TWh)" } },
    plotOptions: {
      column: { stacking: "normal" },
    },
    series,
  });

  const outFile = path.join(OUT_DIR, "final-energy-demand-by-fuel.config.json");
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
