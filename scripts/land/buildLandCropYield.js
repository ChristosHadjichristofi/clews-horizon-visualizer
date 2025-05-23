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

export async function buildLandCropYieldCharts() {
  // ensure output dir
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { landListRows, prodRows } = await loadCsvs();

  // 1) extract (outputName, tech) pairs for "Land potential for crops"
  const pairs = landListRows
    .filter(
      (r) =>
        r.classifier === "Technology" && r.Type === "Land potential for crops"
    )
    .map((r) => ({ outputName: r["Output Name"], tech: r.Name }));

  // 2) filter production rows: FUEL = 'EULDUM' and TECHNOLOGY = R
  const filtered = prodRows.filter(
    (r) => r.FUEL === "EULDUM" && pairs.some((p) => p.tech === r.TECHNOLOGY)
  );

  const byCropType = {};
  filtered.forEach((r) => {
    const year = r.YEAR;
    const value = Number(r.VALUE);
    const tech = r.TECHNOLOGY;
    const pair = pairs.find((p) => p.tech === tech);
    if (!pair) return;

    // A) crop type
    const cropKey = pair.outputName.slice(-3);
    byCropType[cropKey] ??= {};
    byCropType[cropKey][year] = (byCropType[cropKey][year] || 0) + value;
  });

  // 3) compute productionByCode by matching suffix -> code
  const productionByCode = {};
  prodRows
    .filter((r) =>
      pairs.some(
        (p) =>
          p.tech === r.TECHNOLOGY && r.FUEL.slice(-3) === p.tech.slice(6, 9)
      )
    )
    .forEach((r) => {
      const year = r.YEAR;
      const code = r.TECHNOLOGY.slice(6, 9);
      const prod = Number(r.VALUE);
      productionByCode[code] ??= {};
      productionByCode[code][year] = (productionByCode[code][year] || 0) + prod;
    });

  // 4) build sorted list of all years present
  const allYears = Array.from(
    new Set(
      [
        ...Object.values(byCropType).flatMap((m) => Object.keys(m)),
        ...Object.values(productionByCode).flatMap((m) => Object.keys(m)),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  const yieldSeries = Object.entries(productionByCode).map(([code, m]) => ({
    name: `${code}`,
    type: "line",
    data: allYears.map((y) => {
      const prod = m[y] || 0;
      const denom = byCropType[code]?.[y] || 0;
      return denom ? prod / denom : 0;
    }),
  }));

  // 6) write out config
  const tpl = await loadTemplate("line");
  const config = merge({}, tpl, {
    title: { text: "Crop Production & Yield by Code" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Value" } },
    series: annotateLandCropSeries(yieldSeries),
  });

  await fs.writeFile(
    path.join(OUT_DIR, "land-crop-combined-yield.config.json"),
    JSON.stringify(config, null, 2)
  );
  console.log("Wrote land-crop-combined-yield.config.json");
}

export async function buildLandCropProductionCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { landListRows, prodRows } = await loadCsvs();

  // extract pairs
  const pairs = landListRows
    .filter(
      (r) =>
        r.classifier === "Technology" && r.Type === "Land potential for crops"
    )
    .map((r) => ({ outputName: r["Output Name"], tech: r.Name }));

  // productionByCode
  const productionByCode = {};
  prodRows
    .filter((r) =>
      pairs.some(
        (p) =>
          p.tech === r.TECHNOLOGY && r.FUEL.slice(-3) === p.tech.slice(6, 9)
      )
    )
    .forEach((r) => {
      const year = r.YEAR;
      const code = r.TECHNOLOGY.slice(6, 9);
      const prod = Number(r.VALUE);
      productionByCode[code] ??= {};
      productionByCode[code][year] = (productionByCode[code][year] || 0) + prod;
    });

  // derive all years
  const allYears = Array.from(
    new Set(
      Object.values(productionByCode)
        .flatMap((m) => Object.keys(m))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // top-level series: total production per year
  const topSeries = [
    {
      name: "Crop Production",
      color: "#7cb5ec",
      data: allYears.map((year) => {
        const total = Object.values(productionByCode).reduce(
          (sum, m) => sum + (m[year] || 0),
          0
        );
        return {
          name: String(year),
          y: total,
          drilldown: `production-${year}`,
        };
      }),
    },
  ];

  // drilldown series: breakdown by crop code for each year
  const drilldownSeries = await Promise.all(
    allYears.map(async (year) => {
      const rawData = Object.entries(productionByCode).map(([code, m]) => ({
        name: code,
        y: m[year] || 0,
      }));

      const annotated = annotateLandCropSeries(rawData);

      return {
        id: `production-${year}`,
        name: `Production ${year}`,
        type: "column",
        data: annotated,
      };
    })
  );

  // load template & merge config
  const tplProd = await loadTemplate("column");
  const configProd = merge({}, tplProd, {
    title: { text: "Crop Production by Code" },
    subtitle: { text: "Total per year; click to view crop-level breakdown" },
    xAxis: {
      type: "category",
      categories: allYears.map((y) => String(y)),
      title: { text: "Year" },
      tickInterval: 1,
    },
    yAxis: { title: { text: "Production (kt)" } },
    series: topSeries,
    drilldown: { series: drilldownSeries },
  });

  await fs.writeFile(
    path.join(OUT_DIR, "land-crop-production-by-code.config.json"),
    JSON.stringify(configProd, null, 2)
  );
  console.log("Wrote land-crop-production-by-code.config.json");
}
