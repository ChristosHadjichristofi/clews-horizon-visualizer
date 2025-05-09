import { parseCsv, loadTemplate, splitTechnology } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Buildings");

// GWP factors
const GWP = { EUCO2: 1, EUCH4: 28, EUN2O: 265 };

async function loadCsvs() {
  const [prodRows, techListRows, inputActRows, emActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EmissionActivityRatio.csv")),
  ]);
  return { prodRows, techListRows, inputActRows, emActRows };
}

// pivot InputActivityRatio → { fullCode: { year: ratio } }
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

// pivot EmissionActivityRatio → { techSuffix: { year: MtCO2-eq per PJ } }
function pivotEmissions(rows) {
  const m = {};
  rows.forEach((r) => {
    const code = r.TECHNOLOGY;
    const suffix = splitTechnology(code).tech;
    // only rows whose code really is EUEPS{suffix}…
    if (!code.startsWith(`EUEPS${suffix}`)) return;

    const factor = GWP[r.EMISSION];
    if (!factor) return;

    m[suffix] ??= {};
    for (const [k, v] of Object.entries(r)) {
      if (/^\d{4}$/.test(k)) {
        m[suffix][k] = (m[suffix][k] || 0) + Number(v) * factor;
      }
    }
  });
  return m;
}

export async function buildBuildingsEmissionsChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, techListRows, inputActRows, emActRows } = await loadCsvs();

  // 1) pick only Buildings sub-module technologies (drop tech="000")
  const buildingTechs = new Set(
    techListRows
      .filter((r) => r["Sub-module"] === "Buildings")
      .map((r) => r["Technology code"])
      .filter((code) => splitTechnology(code).tech !== "000")
  );

  // 2) pivot inputs & emissions
  const inputMap = pivotInput(inputActRows);
  // filter only the EUEPS…
  const emRows = emActRows.filter((r) =>
    r.TECHNOLOGY.startsWith(`EUEPS${splitTechnology(r.TECHNOLOGY).tech}`)
  );
  const emisMap = pivotEmissions(emRows);

  // 3) accumulate MtCO2-eq by year
  const emissionsByYear = {};
  prodRows
    .filter((r) => buildingTechs.has(r.TECHNOLOGY))
    .forEach((r) => {
      const year = r.YEAR;
      const suffix = splitTechnology(r.TECHNOLOGY).tech;
      const pj = Number(r.VALUE) * (inputMap[r.TECHNOLOGY]?.[year] || 0);
      const mt = pj * (emisMap[suffix]?.[year] || 0);
      emissionsByYear[year] = (emissionsByYear[year] || 0) + mt;
    });

  // 4) build sorted years axis
  const years = Array.from(
    new Set(Object.keys(emissionsByYear).map(Number))
  ).sort((a, b) => a - b);

  // 5) build Highcharts series (single line)
  const series = [
    {
      name: "Buildings GHG Emissions",
      type: "line",
      data: years.map((y) => emissionsByYear[y] || 0),
      marker: { enabled: true },
    },
  ];

  // 6) merge into a line‐chart template & write
  const tpl = await loadTemplate("line");
  const cfg = merge({}, tpl, {
    title: { text: "Annual GHG Emissions – Buildings" },
    subtitle: {
      text: "Emissions from electricity consumption not included in this figure",
    },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Emissions (Mt CO₂-eq)" } },
    series,
  });

  const outFile = path.join(OUT_DIR, "buildings-ghg-emissions.config.json");
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
