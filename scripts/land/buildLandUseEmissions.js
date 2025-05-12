// scripts/buildLandUseEmissionsCharts.js

import {
  parseCsv,
  loadTemplate,
  annotateLandCropSeries,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Land");

// 1) GWP factors for each gas
const GWP = {
  EUCO2: 1,
  EUCH4: 28,
  EUN2O: 265,
};

async function loadCsvs() {
  const [landListRows, prodRows, inputActRows, outputActRows, emActRows] =
    await Promise.all([
      parseCsv(path.join(CSV_DIR, "exported/LandModule_Tech_List.csv")),
      parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
      parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
      parseCsv(path.join(CSV_DIR, "exported/OutputActivityRatio.csv")),
      parseCsv(path.join(CSV_DIR, "exported/EmissionActivityRatio.csv")),
    ]);
  return { landListRows, prodRows, inputActRows, outputActRows, emActRows };
}

export async function buildLandUseEmissionsCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { landListRows, prodRows, inputActRows, outputActRows, emActRows } =
    await loadCsvs();

  //
  // 2) BUILD AREA BY CATEGORY
  //
  const valid = new Set(["Land Cover", "Land Use"]);
  const categoryPairs = landListRows
    .filter((r) => valid.has(r.Type))
    .map((r) => ({
      fuel: r["Output Name"],
      tech: r.Name,
    }));

  const areaByCategory = {};
  for (const { FUEL, TECHNOLOGY, YEAR, VALUE } of prodRows) {
    if (!categoryPairs.find((p) => p.fuel === FUEL && p.tech === TECHNOLOGY))
      continue;
    areaByCategory[TECHNOLOGY] ??= {};
    areaByCategory[TECHNOLOGY][YEAR] =
      (areaByCategory[TECHNOLOGY][YEAR] || 0) + Number(VALUE);
  }

  //
  // 3) PIVOT EMISSION FACTORS PER CATEGORY
  //
  const emissionsFactor = {};
  for (const tech of Object.keys(areaByCategory)) {
    const rows = emActRows.filter(
      (r) =>
        r.TECHNOLOGY === tech &&
        (r.EMISSION === "EUCO2" ||
          r.EMISSION === "EUCH4" ||
          r.EMISSION === "EUN2O")
    );
    const byYear = {};
    for (const row of rows) {
      const factor = GWP[row.EMISSION];
      for (const [k, v] of Object.entries(row)) {
        if (/^\d{4}$/.test(k)) {
          const y = Number(k);
          byYear[y] = (byYear[y] || 0) + Number(v) * factor;
        }
      }
    }
    emissionsFactor[tech] = byYear;
  }

  //
  // 4) COMPUTE FULL YEAR AXIS
  //
  const allYears = Array.from(
    new Set([
      ...Object.values(areaByCategory).flatMap((m) =>
        Object.keys(m).map(Number)
      ),
      ...Object.values(emissionsFactor).flatMap((m) =>
        Object.keys(m).map(Number)
      ),
    ])
  ).sort((a, b) => a - b);

  //
  // 5a) BUILD EMISSIONS SERIES ONLY
  //
  const series = Object.entries(areaByCategory).map(([tech, byArea]) => ({
    name: tech,
    type: "column",
    data: allYears.map(
      (y) => (byArea[y] || 0) * (emissionsFactor[tech][y] || 0)
    ),
  }));

  //
  // 5b) APPEND “Agriculture Emissions” BAR FROM EUEPSDSL0000
  //
  // 5b-i) pivot input/output for these same techs
  const inputMap = {},
    outputMap = {};
  inputActRows
    .filter((r) => r.FUEL === "EULADSL")
    .forEach((r) => {
      inputMap[r.TECHNOLOGY] ??= {};
      Object.entries(r).forEach(([k, v]) => {
        if (/^\d{4}$/.test(k)) inputMap[r.TECHNOLOGY][k] = Number(v);
      });
    });
  outputActRows.forEach((r) => {
    outputMap[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([k, v]) => {
      if (/^\d{4}$/.test(k)) outputMap[r.TECHNOLOGY][k] = Number(v);
    });
  });

  // 5b-ii) get EUEPSDSL0000 CO2/CH4/N2O rows and build one total‐factor by year
  const factorRows = emActRows.filter(
    (r) =>
      r.TECHNOLOGY === "EUEPSDSL0000" &&
      (r.EMISSION === "EUCO2" ||
        r.EMISSION === "EUCH4" ||
        r.EMISSION === "EUN2O")
  );
  const totalFactor = {};
  for (const row of factorRows) {
    const f = GWP[row.EMISSION];
    for (const [k, v] of Object.entries(row)) {
      if (/^\d{4}$/.test(k)) {
        const y = Number(k);
        totalFactor[y] = (totalFactor[y] || 0) + Number(v) * f;
      }
    }
  }

  // 5b-iii) compute “Agriculture Emissions” = area × that totalFactor
  const agEmissions = {};
  for (const { TECHNOLOGY, YEAR, VALUE } of prodRows) {
    // same cropTechs as before (Land potential for crops)
    if (
      landListRows.some(
        (r) =>
          r.classifier === "Technology" &&
          r.Type === "Land potential for crops" &&
          r.Name === TECHNOLOGY
      )
    ) {
      agEmissions[YEAR] =
        (agEmissions[YEAR] || 0) + Number(VALUE) * (totalFactor[YEAR] || 0);
    }
  }

  series.push({
    name: "Agriculture Emissions",
    type: "column",
    data: allYears.map((y) => agEmissions[y] || 0),
  });

  // friendly labels & colors
  const annotated = annotateLandCropSeries(series);

  //
  // 6) WRITE OUT STACKED‐BAR
  //
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    chart: { type: "column" },
    plotOptions: { column: { stacking: "normal" } },
    title: { text: "Annual Land Use GHG Emissions by Category" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Emissions (Mt CO₂-eq)" } },
    series: annotated,
  });

  const outFile = path.join(OUT_DIR, "land-use-emissions.config.json");
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
