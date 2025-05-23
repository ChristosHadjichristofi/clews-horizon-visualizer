import {
  parseCsv,
  loadTemplate,
  splitTechnology,
  splitFuel,
  annotateTechSeries,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Industry");

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
  await fs.mkdir(OUT_DIR, { recursive: true });

  const { prodRows, techListRows, inputActRows } = await loadCsvs();

  const industryTechs = new Set();
  techListRows
    .filter((r) => r["Sub-module"] === "Industry")
    .forEach((r) => {
      const suffix = splitTechnology(r["Technology code"]).tech;
      if (suffix !== "000") {
        industryTechs.add(r["Technology code"]);
      }
    });

  const inputMap = pivotByTechnology(inputActRows);

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

      byFuelYear[fuel] ??= {};
      byFuelYear[fuel][year] = (byFuelYear[fuel][year] || 0) + pj;

      demandByTech[suffix] ??= {};
      demandByTech[suffix][year] = (demandByTech[suffix][year] || 0) + pj;

      demandByCode[techCode] ??= {};
      demandByCode[techCode][year] = (demandByCode[techCode][year] || 0) + pj;
    });

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

  // Chart A: by-Fuel
  const seriesA = Object.entries(byFuelYear).map(([fuel, byY]) => ({
    name: fuel,
    type: "column",
    data: allYears.map((y) => byY[y] || 0),
  }));
  const cfgA = merge({}, tpl, {
    title: { text: "Final-Energy Demand by Sector" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Demand (PJ)" } },
    series: await annotateTechSeries(seriesA),
  });
  await fs.writeFile(
    path.join(OUT_DIR, "industry-fuel-by-fuel.config.json"),
    JSON.stringify(cfgA, null, 2)
  );

  // Chart B: by-TechSuffix
  const seriesB = Object.entries(demandByTech).map(([tech, byY]) => ({
    name: tech,
    type: "column",
    data: allYears.map((y) => byY[y] || 0),
  }));
  const cfgB = merge({}, tpl, {
    title: { text: "Final-Energy Demand by Fuel" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Demand (PJ)" } },
    series: await annotateTechSeries(seriesB),
  });
  await fs.writeFile(
    path.join(OUT_DIR, "industry-fuel-by-tech.config.json"),
    JSON.stringify(cfgB, null, 2)
  );

  // Chart C (full): by-TechCode
  const seriesC = Object.entries(demandByCode).map(([code, byY]) => ({
    name: code,
    type: "column",
    data: allYears.map((y) => byY[y] || 0),
  }));
  const cfgC = merge({}, tpl, {
    title: { text: "Final-Energy Demand by Technology Code" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Demand (PJ)" } },
    series: await annotateTechSeries(seriesC, true),
  });
  await fs.writeFile(
    path.join(OUT_DIR, "industry-fuel-by-code.config.json"),
    JSON.stringify(cfgC, null, 2)
  );

  // Chart D: by Sector – one chart per sector
  const techToSector = {};
  techListRows.forEach((r) => {
    const code = r["Technology code"];

    // Validate the code
    if (typeof code !== "string" || code.trim().length < 8) {
      console.warn("Skipping invalid Technology code:", code);
      return;
    }

    const { tech } = splitTechnology(code);
    if (tech !== "000") {
      techToSector[code] = r.Type;
    }
  });

  const demandBySector = {};
  for (const [code, data] of Object.entries(demandByCode)) {
    const sector = techToSector[code];
    if (!sector) continue;
    demandBySector[sector] ??= {};
    demandBySector[sector][code] = data;
  }

  for (const [sector, codes] of Object.entries(demandBySector)) {
    const series = Object.entries(codes).map(([code, byY]) => ({
      name: code,
      type: "column",
      data: allYears.map((y) => byY[y] || 0),
    }));
    const cfg = merge({}, tpl, {
      title: { text: `Final-Energy Demand by Technology Code – ${sector}` },
      xAxis: { categories: allYears, title: { text: "Year" } },
      yAxis: { title: { text: "Demand (PJ)" } },
      series: await annotateTechSeries(series, true),
    });
    const safeName = sector.toLowerCase().replace(/[^a-z0-9]+/gi, "-");
    await fs.writeFile(
      path.join(OUT_DIR, `industry-fuel-by-code-${safeName}.config.json`),
      JSON.stringify(cfg, null, 2)
    );
    console.log(`Wrote industry-fuel-by-code-${sector}.config.json`);
  }
}
