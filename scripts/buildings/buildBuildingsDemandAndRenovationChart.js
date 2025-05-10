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

// the three renovation‐activity tech codes
const RENOVATION_TECHS = ["EUEBD000EELO", "EUEBD000EEME", "EUEBD000EEHI"];

/** Pivot InputActivityRatio → { [TECH]: { [year]: ratio } } */
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

export async function buildBuildingsDemandAndRenovationChart() {
  // 1) ensure output dir
  await fs.mkdir(OUT_DIR, { recursive: true });

  // 2) load everything
  const [prodRows, techListRows, inputActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
  ]);

  // 3) identify all buildings techs (suffix!="000")
  const buildingTechs = techListRows
    .filter((r) => r["Sub-module"] === "Buildings")
    .map((r) => r["Technology code"])
    .filter((code) => splitTechnology(code).tech !== "000");

  // 4) pivot input→ratio
  const inputMap = pivotByTechnology(inputActRows);

  // 5) accumulate demand by techSuffix→year
  const demand = {}; // { suffix: { year: PJ } }
  prodRows
    .filter((r) => buildingTechs.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const suffix = splitTechnology(r.TECHNOLOGY).tech;
      const year = r.YEAR;
      const ratio = inputMap[r.TECHNOLOGY]?.[year] || 0;
      const pj = Number(r.VALUE) * ratio;
      demand[suffix] ??= {};
      demand[suffix][year] = (demand[suffix][year] || 0) + pj;
    });

  // 6) accumulate savings by RENOVATION_TECHS→year (NEGATIVE!)
  const savings = {}; // { code: { year: -VALUE } }
  prodRows
    .filter((r) => RENOVATION_TECHS.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const code = r.TECHNOLOGY;
      const year = r.YEAR;
      const val = -Number(r.VALUE); // ← make negative
      savings[code] ??= {};
      savings[code][year] = (savings[code][year] || 0) + val;
    });

  // 7) build unified years axis
  const years = Array.from(
    new Set(
      [
        ...Object.values(demand).flatMap(Object.keys),
        ...Object.values(savings).flatMap(Object.keys),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  // 8) build Highcharts series
  const demandSeries = Object.entries(demand)
    .map(([suffix, byYear]) => ({
      name: suffix,
      type: "column",
      data: years.map((y) => byYear[y] || 0),
    }))
    .filter((s) => s.data.some((v) => v !== 0));

  const savingsSeries = RENOVATION_TECHS.map((code) => ({
    name: code,
    type: "column",
    data: years.map((y) => savings[code]?.[y] || 0),
  }));

  const series = [...demandSeries, ...savingsSeries];

  const seriesAnnotated = await annotateTechSeries(series);

  // 9) merge into stackedBar template & write config
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    title: {
      text: "Final‐Energy Demand & Renovation Savings",
    },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "PJ" } },
    series: seriesAnnotated,
  });

  const fileName = "buildings-demand-and-renovation.config.json";
  await fs.writeFile(
    path.join(OUT_DIR, fileName),
    JSON.stringify(cfg, null, 2)
  );
  console.log("Wrote", fileName);
}
