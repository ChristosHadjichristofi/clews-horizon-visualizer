import { parseCsv, loadTemplate } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Water");

async function loadCsvs() {
  const prodRows = await parseCsv(
    path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")
  );
  return { prodRows };
}

export async function buildWaterAbstractionCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows } = await loadCsvs();

  // 1) filter and sum by year & source
  const surfaceByYear = {};
  const groundByYear = {};

  for (const { TECHNOLOGY, YEAR, VALUE } of prodRows) {
    if (!TECHNOLOGY.startsWith("EUWDEM")) continue;

    const y = Number(YEAR);
    const v = Number(VALUE);

    if (TECHNOLOGY.endsWith("SUR")) {
      surfaceByYear[y] = (surfaceByYear[y] || 0) + v;
    } else if (TECHNOLOGY.endsWith("GWT")) {
      groundByYear[y] = (groundByYear[y] || 0) + v;
    }
  }

  // 2) shared year axis
  const allYears = Array.from(
    new Set(
      [...Object.keys(surfaceByYear), ...Object.keys(groundByYear)].map(Number)
    )
  ).sort((a, b) => a - b);

  // 3) build stacked series
  const series = [
    {
      name: "Surface water",
      type: "column",
      data: allYears.map((y) => surfaceByYear[y] || 0),
    },
    {
      name: "Groundwater",
      type: "column",
      data: allYears.map((y) => groundByYear[y] || 0),
    },
  ];

  // 4) render to stacked‐bar template
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    chart: { type: "column" },
    plotOptions: { column: { stacking: "normal" } },
    title: { text: "Annual Water Abstraction by Source" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Abstraction (kt)" } },
    series,
  });

  // 5) write out
  const outFile = path.join(OUT_DIR, "water-abstraction-by-source.config.json");
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
