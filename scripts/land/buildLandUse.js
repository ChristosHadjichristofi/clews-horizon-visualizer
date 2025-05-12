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
  const [landListRows, prodRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "exported/LandModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
  ]);
  return { landListRows, prodRows };
}

export async function buildLandUseCharts() {
  // 1) ensure output dir
  await fs.mkdir(OUT_DIR, { recursive: true });

  // 2) load data
  const { landListRows, prodRows } = await loadCsvs();

  // 3) extract pairs from LandModule_Tech_List: Output Name -> Name
  const validTypes = new Set(["Land Cover", "Land Use"]);
  const pairs = landListRows
    .filter((r) => validTypes.has(r.Type))
    .map((r) => ({ outputName: r["Output Name"], category: r.Name }));

  // 4) filter production rows matching those pairs
  const filtered = prodRows.filter((r) =>
    pairs.some((p) => p.outputName === r.FUEL && p.category === r.TECHNOLOGY)
  );

  // 5) accumulate area by category -> year
  const areaByCategory = {};
  filtered.forEach((r) => {
    const year = r.YEAR;
    const category = r.TECHNOLOGY;
    const value = Number(r.VALUE);
    areaByCategory[category] ??= {};
    areaByCategory[category][year] =
      (areaByCategory[category][year] || 0) + value;
  });

  // 6) derive sorted list of years
  const allYears = Array.from(
    new Set(
      Object.values(areaByCategory)
        .flatMap((byY) => Object.keys(byY))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // 7) build chart config
  const tpl = await loadTemplate("stackedBar");
  const series = Object.entries(areaByCategory).map(([category, byYear]) => ({
    name: category,
    type: "column",
    data: allYears.map((y) => byYear[y] || 0),
  }));

  const annotatedSeries = annotateLandCropSeries(series);

  const config = merge({}, tpl, {
    title: { text: "Land Use Area by Dominant Category" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Area (1000 km²)" } },
    series: annotatedSeries,
  });

  // 8) write config
  const fileName = "land-use-area-by-category.config.json";
  await fs.writeFile(
    path.join(OUT_DIR, fileName),
    JSON.stringify(config, null, 2)
  );
  console.log("Wrote", fileName);
}
