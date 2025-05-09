import { parseCsv, loadTemplate, splitTechnology } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Overarching");

/** Pivot InputActivityRatio into { [TECH]: { [year]: ratio } } */
function pivotInput(rows) {
  const m = {};
  rows.forEach((r) => {
    m[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([col, val]) => {
      if (/^[0-9]{4}$/.test(col)) {
        m[r.TECHNOLOGY][col] = Number(val);
      }
    });
  });
  return m;
}

async function loadCsvs() {
  const [prodRows, techListRows, inputActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
  ]);
  return { prodRows, techListRows, inputActRows };
}

export async function buildPrimarySupplyByFuelChart() {
  // 1) ensure output dir
  await fs.mkdir(OUT_DIR, { recursive: true });

  // 2) load CSV data
  const { prodRows, techListRows, inputActRows } = await loadCsvs();

  // 3) restrict to Primary sub-module technologies
  const primaryTechs = new Set(
    techListRows
      .filter(
        (r) =>
          r["Sub-module"] === "Primary" || r["Sub-module"] === "Electricity"
      )
      .map((r) => r["Technology code"])
  );

  // 4) pivot input ratios
  const inputMap = pivotInput(inputActRows);

  // 5) accumulate supply PJ by suffix → year
  const supplyBySuffix = {}; // { [suffix]: { [year]: PJ } }
  prodRows
    .filter((r) => {
      const code = r.TECHNOLOGY;
      if (!primaryTechs.has(code)) return false;
      // chars 4–5 === "PS", chars 6–10 === "BIOPS", or chars 4–8 === "EGBIO"
      // c
      return (
        code.slice(3, 5) === "PS" ||
        code.slice(5, 10) === "BIOPS" ||
        code.slice(3, 8) === "EGBIO" ||
        code.slice(3, 8) === "HGBIO"
      );
    })
    .forEach((r) => {
      const code = r.TECHNOLOGY;
      const suffix = splitTechnology(code).tech;
      const year = r.YEAR;
      const rawValue = Number(r.VALUE);

      // only EGBIO codes are converted via input ratio
      let pj;
      if (code.slice(3, 8) === "EGBIO" || code.slice(3, 8) === "HGBIO") {
        const ratio = inputMap[code]?.[year] || 0;

        pj = rawValue * ratio;
      } else {
        pj = rawValue; // PS and BIOPS are already in PJ
      }

      supplyBySuffix[suffix] ??= {};
      supplyBySuffix[suffix][year] = (supplyBySuffix[suffix][year] || 0) + pj;
    });

  // 6) build sorted list of all years
  const allYears = Array.from(
    new Set(
      Object.values(supplyBySuffix)
        .flatMap((byYear) => Object.keys(byYear))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // 7) build Highcharts series (one column series per suffix)
  const series = Object.entries(supplyBySuffix).map(([suffix, byYear]) => ({
    name: suffix,
    type: "column",
    data: allYears.map((y) => byYear[y] || 0),
  }));

  // 8) merge into template and write config
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    title: { text: "Primary Energy Supply Projections by Fuel" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Supply (PJ)" } },
    series,
  });

  const outFile = path.join(
    OUT_DIR,
    "overarching-primary-supply-by-fuel.config.json"
  );
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
