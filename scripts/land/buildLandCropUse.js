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

export async function buildLandCropUseCharts() {
  // ensure output dir
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { landListRows, prodRows } = await loadCsvs();

  // 1) extract pairs: Output Name (col I) and Name (col R)
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

  // 3) aggregate:
  //    A) crop type = last 3 chars of Output Name
  //    B) water use  = 11th char of TECHNOLOGY
  //    C) input level = 10th char of TECHNOLOGY
  const byCropType = {};
  const byWaterUse = {};
  const byInputLvl = {};

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

    // B) water use
    const waterKey = tech.charAt(10);
    byWaterUse[waterKey] ??= {};
    byWaterUse[waterKey][year] = (byWaterUse[waterKey][year] || 0) + value;

    // C) input level
    const inputKey = tech.charAt(9);
    byInputLvl[inputKey] ??= {};
    byInputLvl[inputKey][year] = (byInputLvl[inputKey][year] || 0) + value;
  });

  // 4) derive sorted list of years
  const allYears = Array.from(
    new Set(
      [
        ...Object.values(byCropType).flatMap((m) => Object.keys(m)),
        ...Object.values(byWaterUse).flatMap((m) => Object.keys(m)),
        ...Object.values(byInputLvl).flatMap((m) => Object.keys(m)),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  // Chart configs
  const tpl = await loadTemplate("stackedBar");

  // Chart 1: by crop type — with drilldown by year and annotated crops
  const topSeriesCrop = [
    {
      name: "Crop Land Use",
      color: "#7cb5ec",
      data: allYears.map((year) => {
        const total = Object.values(byCropType).reduce(
          (sum, m) => sum + (m[year] || 0),
          0
        );
        return {
          name: String(year),
          y: total,
          drilldown: `crop-${year}`,
        };
      }),
    },
  ];

  const drilldownCropSeries = allYears.map((year) => ({
    id: `crop-${year}`,
    name: `Crop Type Breakdown ${year}`,
    type: "column",
    data: Object.entries(byCropType).map(([cropKey, m]) => {
      const annotated = annotateLandCropSeries([
        { name: cropKey, data: [] }, // dummy call to get name/color
      ])[0];
      return {
        name: annotated.name,
        y: m[year] || 0,
        color: annotated.color,
      };
    }),
  }));
  const cfgCrop = merge({}, tpl, {
    chart: { type: "column" },
    title: { text: "Crop Land Use by Crop Type" },
    subtitle: {
      text: "Total area by year with breakdown by crop type (click year column)",
    },
    xAxis: {
      type: "category",
      categories: allYears.map((y) => String(y)),
      title: { text: "Year" },
      tickInterval: 1,
    },
    yAxis: { title: { text: "Area (1000 km²)" } },
    series: topSeriesCrop,
    drilldown: { series: drilldownCropSeries },
  });

  await fs.writeFile(
    path.join(OUT_DIR, "land-crop-area-by-type.config.json"),
    JSON.stringify(cfgCrop, null, 2)
  );

  // Chart 2: by water use
  const seriesWater = Object.entries(byWaterUse).map(([key, m]) => ({
    name: key === "I" ? "Irrigated" : "Rainfed",
    type: "column",
    data: allYears.map((y) => m[y] || 0),
  }));
  const cfgWater = merge({}, tpl, {
    title: { text: "Crop Land Use by Water Use" },
    subtitle: { text: "Area under irrigation vs. rainfed (1000 km²)" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Area (1000 km²)" } },
    series: annotateLandCropSeries(seriesWater),
  });
  await fs.writeFile(
    path.join(OUT_DIR, "land-crop-area-by-water.config.json"),
    JSON.stringify(cfgWater, null, 2)
  );

  // Chart 3: by input level
  const seriesInput = Object.entries(byInputLvl).map(([key, m]) => ({
    name: key === "H" ? "High Input" : "Low Input",
    type: "column",
    data: allYears.map((y) => m[y] || 0),
    color: key === "H" ? "#00AA00" : "#DD0000",
  }));
  const cfgInput = merge({}, tpl, {
    title: { text: "Crop Land Use by Input Level" },
    subtitle: { text: "Area under High vs. Low input (1000 km²)" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Area (1000 km²)" } },
    series: annotateLandCropSeries(seriesInput),
  });
  await fs.writeFile(
    path.join(OUT_DIR, "land-crop-area-by-input.config.json"),
    JSON.stringify(cfgInput, null, 2)
  );

  console.log("Wrote land-crop-area-by-type.config.json");
  console.log("Wrote land-crop-area-by-water.config.json");
  console.log("Wrote land-crop-area-by-input.config.json");
}
