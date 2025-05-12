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

async function loadCsvs() {
  const [landListRows, prodRows, inputActRows, outputActRows] =
    await Promise.all([
      parseCsv(path.join(CSV_DIR, "exported/LandModule_Tech_List.csv")),
      parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
      parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
      parseCsv(path.join(CSV_DIR, "exported/OutputActivityRatio.csv")),
    ]);
  return { landListRows, prodRows, inputActRows, outputActRows };
}

export async function buildEnergyUseByLandCoverCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { landListRows, prodRows, inputActRows, outputActRows } =
    await loadCsvs();

  // 1) extract (outputName, tech) pairs
  const pairs = landListRows
    .filter(
      (r) =>
        r.classifier === "Technology" && r.Type === "Land potential for crops"
    )
    .map((r) => ({ outputName: r["Output Name"], tech: r.Name }));

  // 2) pivot InputActivityRatio for FUEL = EULADSL
  const inputMap = {};
  inputActRows
    .filter((r) => r.FUEL === "EULADSL")
    .forEach((r) => {
      inputMap[r.TECHNOLOGY] ??= {};
      Object.entries(r).forEach(([col, val]) => {
        if (/^\d{4}$/.test(col)) inputMap[r.TECHNOLOGY][col] = Number(val);
      });
    });

  // 3) pivot OutputActivityRatio by TECHNOLOGY
  const outputMap = {};
  outputActRows.forEach((r) => {
    outputMap[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([col, val]) => {
      if (/^\d{4}$/.test(col)) outputMap[r.TECHNOLOGY][col] = Number(val);
    });
  });

  // 4) filter & compute energy use per year with debug prints
  const energyByYear = {};
  prodRows
    .filter((r) =>
      pairs.some(
        (p) =>
          r.TECHNOLOGY === p.tech && r.FUEL.slice(-3) === p.tech.slice(6, 9)
      )
    )
    .forEach((r) => {
      const year = r.YEAR;
      const tech = r.TECHNOLOGY;
      const prod = Number(r.VALUE);
      const inputRatio = inputMap[tech]?.[year] ?? 0;
      const outputRatio = outputMap[tech]?.[year] ?? 0;
      const energy = outputRatio ? (prod * inputRatio) / outputRatio : 0;

      energyByYear[year] = (energyByYear[year] || 0) + energy;
    });

  // 5) build sorted list of years
  const allYears = Object.keys(energyByYear)
    .map(Number)
    .sort((a, b) => a - b);

  // 6) build series & write config
  const series = [
    {
      name: "Energy use",
      type: "column",
      data: allYears.map((y) => energyByYear[y] || 0),
    },
  ];

  const annotatedSeries = annotateLandCropSeries(series);

  const tpl = await loadTemplate("column");
  const config = merge({}, tpl, {
    title: { text: "Energy Use by Land Cover (Crops)" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Energy use (PJ)" } },
    series: annotatedSeries,
  });

  const fileName = "land-energy-use-by-cover.config.json";
  await fs.writeFile(
    path.join(OUT_DIR, fileName),
    JSON.stringify(config, null, 2)
  );
  console.log("Wrote", fileName);
}
