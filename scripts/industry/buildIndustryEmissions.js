// scripts/buildIndustryEmissions.js

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
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Industry");

// GWP factors
const GWP = {
  EUCO2: 1,
  EUCH4: 28,
  // EUCH4_ETS: 28,
  EUN2O: 265,
  // EUN2O_ETS: 265,
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

/** Collects generic suffix entries: EUEPS{suffix}… */
function pivotSuffixEmissions(rows) {
  const m = {};
  rows.forEach((r) => {
    const code = r.TECHNOLOGY;
    const suffix = splitTechnology(code).tech;
    if (!code.startsWith(`EUEPS${suffix}`)) return;

    const factor = GWP[r.EMISSION];
    if (!factor) return;

    m[suffix] ??= {};
    Object.entries(r).forEach(([k, v]) => {
      if (/^\d{4}$/.test(k)) {
        m[suffix][k] = (m[suffix][k] || 0) + Number(v) * factor;
      }
    });
  });
  return m;
}

/** Collects any full-code entries that exactly match one of our Industry techs */
function pivotFullEmissions(rows, techToSector) {
  const m = {};
  rows.forEach((r) => {
    const code = r.TECHNOLOGY;
    if (!techToSector[code]) return;

    const factor = GWP[r.EMISSION];
    if (!factor) return;

    m[code] ??= {};
    Object.entries(r).forEach(([k, v]) => {
      if (/^\d{4}$/.test(k)) {
        m[code][k] = (m[code][k] || 0) + Number(v) * factor;
      }
    });
  });
  return m;
}

export async function buildIndustryEmissionsCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, techListRows, inputActRows, emActRows } = await loadCsvs();

  // 1) map non-“000” Industry techs → sector
  const techToSector = {};
  techListRows
    .filter((r) => r["Sub-module"] === "Industry")
    .forEach((r) => {
      if (splitTechnology(r["Technology code"]).tech !== "000") {
        techToSector[r["Technology code"]] = r.Type;
      }
    });

  // 2) pivot inputs & both kinds of emissions
  const inputMap = pivotInput(inputActRows);
  const suffixMap = pivotSuffixEmissions(emActRows);
  const fullCodeMap = pivotFullEmissions(emActRows, techToSector);

  // 3) accumulate emissions by sector & overall total
  const bySector = {};
  const total = {};

  prodRows
    .filter((r) => techToSector[r.TECHNOLOGY])
    .forEach((r) => {
      const code = r.TECHNOLOGY;
      const suffix = splitTechnology(code).tech;
      const sector = techToSector[code];
      const year = String(r.YEAR);
      const raw = Number(r.VALUE);

      // convert to PJ via input ratio
      const p = raw * (inputMap[code]?.[year] || 0);

      // always apply suffix factor…
      const eS = suffixMap[suffix]?.[year] || 0;
      // …and if there’s an exact, full-code factor, apply that too
      const eF = fullCodeMap[code]?.[year] || 0;

      const mt = p * eS + p * eF;

      bySector[sector] ??= {};
      bySector[sector][year] = (bySector[sector][year] || 0) + mt;

      total[year] = (total[year] || 0) + mt;
    });

  // 4) shared years axis
  const years = Array.from(
    new Set([
      ...Object.values(bySector).flatMap((m) => Object.keys(m)),
      ...Object.keys(total),
    ])
  )
    .map(Number)
    .sort((a, b) => a - b);

  // 5) render two line charts
  const tpl = await loadTemplate("line");

  // — by‐Sector —
  const seriesSector = Object.entries(bySector).map(([sector, m]) => ({
    name: sector,
    type: "line",
    data: years.map((y) => m[y] || 0),
    marker: { enabled: true },
  }));
  const cfgSector = merge({}, tpl, {
    title: { text: "Annual GHG Emissions by Sector" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Emissions (MtCO₂-eq)" } },
    series: await annotateTechSeries(seriesSector),
  });
  await fs.writeFile(
    path.join(OUT_DIR, "industry-emissions-by-sector.config.json"),
    JSON.stringify(cfgSector, null, 2)
  );
  console.log("Wrote industry-emissions-by-sector.config.json");

  // — total Industry —
  const seriesTotal = [
    {
      name: "All Industry",
      type: "line",
      data: years.map((y) => total[y] || 0),
      color: "#d62728",
      marker: { enabled: true },
    },
  ];
  const cfgTotal = merge({}, tpl, {
    title: { text: "Annual GHG Emissions" },
    subtitle: {
      text: "Emissions from electricity consumption not included in this figure",
    },
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
