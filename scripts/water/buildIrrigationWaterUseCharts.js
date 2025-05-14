import {
  parseCsv,
  loadTemplate,
  annotateLandCropSeries,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Water");

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

export async function buildIrrigationWaterUseCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { landListRows, prodRows, inputActRows, outputActRows } =
    await loadCsvs();

  //
  // ONLY KEEP THOSE “Land potential for crops” TECH CODES THAT ARE IRRIGATED
  //
  const irrigationTechs = new Set(
    landListRows
      .filter(
        (r) =>
          r.classifier === "Technology" && r.Type === "Land potential for crops"
      )
      .map((r) => r.Name)
      .filter((code) => code.charAt(10) === "I")
  );

  //
  // 1) pivot input‐activity for FUEL = EUWAGR
  //
  const inputMap = {};
  inputActRows
    .filter((r) => r.FUEL === "EUWAGR" && irrigationTechs.has(r.TECHNOLOGY))
    .forEach((r) => {
      inputMap[r.TECHNOLOGY] ??= {};
      for (const [k, v] of Object.entries(r)) {
        if (/^\d{4}$/.test(k)) inputMap[r.TECHNOLOGY][Number(k)] = Number(v);
      }
    });

  //
  // 2) pivot output‐activity by matching suffix
  //
  const outputMap = {};
  outputActRows.forEach((r) => {
    if (!irrigationTechs.has(r.TECHNOLOGY)) return;
    if (r.FUEL.slice(-3) !== r.TECHNOLOGY.slice(6, 9)) return;
    outputMap[r.TECHNOLOGY] ??= {};
    for (const [k, v] of Object.entries(r)) {
      if (/^\d{4}$/.test(k)) outputMap[r.TECHNOLOGY][Number(k)] = Number(v);
    }
  });

  //
  // 3) accumulate only valid irrigation crops
  //
  const useByCrop = {};
  for (const { TECHNOLOGY, FUEL, YEAR, VALUE } of prodRows) {
    if (FUEL !== `EULDUM`) continue;
    if (!irrigationTechs.has(TECHNOLOGY)) continue;
    const year = Number(YEAR);
    const prod = Number(VALUE);
    const inR = inputMap[TECHNOLOGY]?.[year];
    // const outR = outputMap[TECHNOLOGY]?.[year];

    const irrigation = prod * inR;

    const crop = TECHNOLOGY.slice(6, 9);
    useByCrop[crop] ??= {};
    useByCrop[crop][year] = (useByCrop[crop][year] || 0) + irrigation;
  }

  //
  // 4) shared year axis
  //
  const allYears = Array.from(
    new Set(Object.values(useByCrop).flatMap((m) => Object.keys(m).map(Number)))
  ).sort((a, b) => a - b);

  //
  // 5) build stacked series
  //
  const series = Object.entries(useByCrop).map(([crop, byYear]) => ({
    name: crop,
    type: "column",
    data: allYears.map((y) => byYear[y] || 0),
  }));

  //
  // 6) render
  //
  const annotated = annotateLandCropSeries(series);
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    chart: { type: "column" },
    plotOptions: { column: { stacking: "normal" } },
    title: { text: "Irrigation Water Use by Crop Type" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Irrigation Water (kt)" } },
    series: annotated,
  });

  const outFile = path.join(OUT_DIR, "water-irrigation-by-crop.config.json");
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
