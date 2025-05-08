// scripts/buildIndustryFuelConsumption.js

import {
  parseCsv,
  loadTemplate,
  splitTechnology,
  splitFuel,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Industry");

/** Pivot InputActivityRatio into { [TECH]: { [year]: PJ_per_unit } } */
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

async function loadCsvs() {
  const [prodRows, techListRows, inputActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
  ]);
  return { prodRows, techListRows, inputActRows };
}

export async function buildIndustryFuelConsumptionCharts() {
  // ensure output dir
  await fs.mkdir(OUT_DIR, { recursive: true });

  // load
  const { prodRows, techListRows, inputActRows } = await loadCsvs();

  // identify industry tech codes (drop tech="000")
  const industryTechs = new Set();
  techListRows
    .filter((r) => r["Sub-module"] === "Industry")
    .forEach((r) => {
      const suffix = splitTechnology(r["Technology code"]).tech;
      if (suffix !== "000") {
        industryTechs.add(r["Technology code"]);
      }
    });

  // pivot input ratios
  const inputMap = pivotByTechnology(inputActRows);

  // build shared year axis candidates
  const byFuelYear = {};
  const demandByTech = {};
  const demandByCode = {};

  prodRows
    .filter(
      (r) =>
        r.FUEL[3] === "U" &&
        r.FUEL[4] === "E" &&
        industryTechs.has(r.TECHNOLOGY)
    )
    .forEach((r) => {
      const techCode = r.TECHNOLOGY;
      const suffix = splitTechnology(techCode).tech;
      const fuel = splitFuel(r.FUEL).fuelType;
      const year = r.YEAR;
      const pj = Number(r.VALUE) * (inputMap[techCode]?.[year] || 0);

      // ▶ by-fuel
      byFuelYear[fuel] ??= {};
      byFuelYear[fuel][year] = (byFuelYear[fuel][year] || 0) + pj;

      // ▶ by-techSuffix
      demandByTech[suffix] ??= {};
      demandByTech[suffix][year] = (demandByTech[suffix][year] || 0) + pj;

      // ▶ by-full Technology code
      demandByCode[techCode] ??= {};
      demandByCode[techCode][year] = (demandByCode[techCode][year] || 0) + pj;
    });

  // shared years axis
  const allYears = Array.from(
    new Set(
      [
        ...Object.values(byFuelYear).flatMap((m) => Object.keys(m)),
        ...Object.values(demandByTech).flatMap((m) => Object.keys(m)),
        ...Object.values(demandByCode).flatMap((m) => Object.keys(m)),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  const tpl = await loadTemplate("stackedBar");

  // — Chart A: by-Fuel —
  const cfgFuel = merge({}, tpl, {
    title: { text: "Final-Energy Demand by Fuel – Industry" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Demand (PJ)" } },
    series: Object.entries(byFuelYear).map(([fuel, byY]) => ({
      name: fuel,
      type: "column",
      data: allYears.map((y) => byY[y] || 0),
    })),
  });
  await fs.writeFile(
    path.join(OUT_DIR, "industry-fuel-by-fuel.config.json"),
    JSON.stringify(cfgFuel, null, 2)
  );
  console.log("Wrote industry-fuel-by-fuel.config.json");

  // — Chart B: by-TechSuffix —
  const cfgTech = merge({}, tpl, {
    title: { text: "Final-Energy Demand by Technology – Industry" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Demand (PJ)" } },
    series: Object.entries(demandByTech).map(([tech, byY]) => ({
      name: tech,
      type: "column",
      data: allYears.map((y) => byY[y] || 0),
    })),
  });
  await fs.writeFile(
    path.join(OUT_DIR, "industry-fuel-by-tech.config.json"),
    JSON.stringify(cfgTech, null, 2)
  );
  console.log("Wrote industry-fuel-by-tech.config.json");

  // — Chart C: by-Full Technology Code (not aggregated) —
  const cfgCode = merge({}, tpl, {
    title: { text: "Final-Energy Demand by Technology Code – Industry" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Demand (PJ)" } },
    series: Object.entries(demandByCode).map(([code, byY]) => ({
      name: code,
      type: "column",
      data: allYears.map((y) => byY[y] || 0),
    })),
  });
  await fs.writeFile(
    path.join(OUT_DIR, "industry-fuel-by-code.config.json"),
    JSON.stringify(cfgCode, null, 2)
  );
  console.log("Wrote industry-fuel-by-code.config.json");
}
