// scripts/buildIndustryEmissions.js

import { parseCsv, loadTemplate, splitTechnology } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Industry");

// GWP factors
const GWP = {
  EUCO2: 1,
  EUCH4: 28,
  EUCH4_ETS: 28,
  EUN2O: 265,
  EUN2O_ETS: 265,
};

async function loadCsvs() {
  const [prodRows, techListRows, inputActRows, emActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EmissionActivityRatio.csv")),
  ]);
  return { prodRows, techListRows, inputActRows, emActRows };
}

/** { TECH → { year → PJ_input } } */
function pivotInput(rows) {
  const m = {};
  rows.forEach((r) => {
    m[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([k, v]) => {
      if (/^\d{4}$/.test(k)) m[r.TECHNOLOGY][k] = Number(v);
    });
  });
  return m;
}

/** { techSuffix → { year → MtCO2eq_per_PJ } } */
function pivotEmissions(rows) {
  const m = {};
  rows.forEach((r) => {
    const factor = GWP[r.EMISSION];
    if (!factor) return;
    const suffix = splitTechnology(r.TECHNOLOGY).tech;
    m[suffix] ??= {};
    Object.entries(r).forEach(([k, v]) => {
      if (/^\d{4}$/.test(k)) {
        m[suffix][k] = (m[suffix][k] || 0) + Number(v) * factor;
      }
    });
  });
  return m;
}

export async function buildIndustryEmissionsCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, techListRows, inputActRows, emActRows } = await loadCsvs();

  // map each Industry technology → its sector
  const techToSector = {};
  techListRows
    .filter((r) => r["Sub-module"] === "Industry")
    .forEach((r) => {
      const tech = r["Technology code"];
      // drop tech suffix "000"
      if (splitTechnology(tech).tech !== "000") {
        techToSector[tech] = r.Type;
      }
    });

  const inputMap = pivotInput(inputActRows);
  const emisMap = pivotEmissions(emActRows);

  // accumulate emissions by sector & total
  const bySector = {};
  const total = {};

  prodRows
    .filter((r) => techToSector[r.TECHNOLOGY])
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const suffix = splitTechnology(tech).tech;
      const sector = techToSector[tech];
      const year = r.YEAR;
      const output = Number(r.VALUE);
      const pj = output * (inputMap[tech]?.[year] || 0);
      const mt = pj * (emisMap[suffix]?.[year] || 0);

      bySector[sector] ??= {};
      bySector[sector][year] = (bySector[sector][year] || 0) + mt;

      total[year] = (total[year] || 0) + mt;
    });

  // shared years axis
  const years = Array.from(
    new Set(
      [
        ...Object.values(bySector).flatMap((m) => Object.keys(m)),
        ...Object.keys(total),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  // load a line-chart template (falls back if not exists)
  let tpl;
  try {
    tpl = await loadTemplate("line");
  } catch {
    tpl = await loadTemplate("stackedBar");
  }

  // — Chart 1: by‐Sector (one line per industrial sector) —
  const seriesSector = Object.entries(bySector).map(([sector, m]) => ({
    name: sector,
    type: "line",
    data: years.map((y) => m[y] || 0),
  }));
  const cfgSector = merge({}, tpl, {
    title: { text: "Annual GHG Emissions by Sector – Industry" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Emissions (MtCO₂-eq)" } },
    series: seriesSector,
  });
  await fs.writeFile(
    path.join(OUT_DIR, "industry-emissions-by-sector.config.json"),
    JSON.stringify(cfgSector, null, 2)
  );
  console.log("Wrote industry-emissions-by-sector.config.json");

  // — Chart 2: total industry (single line) —
  const seriesTotal = [
    {
      name: "All Industry",
      type: "line",
      data: years.map((y) => total[y] || 0),
    },
  ];
  const cfgTotal = merge({}, tpl, {
    title: { text: "Annual GHG Emissions – All Industry" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Emissions (MtCO₂-eq)" } },
    series: seriesTotal,
  });
  await fs.writeFile(
    path.join(OUT_DIR, "industry-emissions-total.config.json"),
    JSON.stringify(cfgTotal, null, 2)
  );
  console.log("Wrote industry-emissions-total.config.json");
}
