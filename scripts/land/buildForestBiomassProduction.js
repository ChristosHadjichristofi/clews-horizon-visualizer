import { parseCsv, loadTemplate } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Land");

async function loadCsvs() {
  const [, prodRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "exported/LandModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
  ]);
  return { prodRows };
}

export async function buildForestBiomassProductionCharts() {
  // ensure output dir
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows } = await loadCsvs();

  // 1) filter only forest-biomass rows
  const filtered = prodRows.filter(
    (r) => r.TECHNOLOGY === "EUL000FOR000" && r.FUEL === "EUEBIO"
  );

  // 2) aggregate production by year
  const productionByYear = {};
  filtered.forEach((r) => {
    const year = r.YEAR;
    const prod = Number(r.VALUE);
    productionByYear[year] = (productionByYear[year] || 0) + prod;
  });

  // 3) build sorted list of years
  const allYears = Object.keys(productionByYear)
    .map(Number)
    .sort((a, b) => a - b);

  // 4) build the series
  const series = [
    {
      name: "Forest biomass",
      type: "column",
      data: allYears.map((y) => productionByYear[y] || 0),
    },
  ];

  // 5) write out config
  const tpl = await loadTemplate("column");
  const config = merge({}, tpl, {
    title: { text: "Forest Biomass Production" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Production (PJ)" } },
    series,
  });

  const fileName = "forest-biomass-production.config.json";
  await fs.writeFile(
    path.join(OUT_DIR, fileName),
    JSON.stringify(config, null, 2)
  );
  console.log("Wrote", fileName);
}
