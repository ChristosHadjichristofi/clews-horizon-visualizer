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
  const prodRows = await parseCsv(
    path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")
  );
  return { prodRows };
}

export async function buildWaterBalanceCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows } = await loadCsvs();

  // 1) initialize accumulators
  const precipByYear = {};
  const infilByYear = {};
  const evapByYear = {};
  const gwByYear = {};
  const runByYear = {};

  // 2) classify and sum
  for (const { TECHNOLOGY, FUEL, YEAR, VALUE } of prodRows) {
    const y = Number(YEAR);
    const v = Number(VALUE);

    if (TECHNOLOGY === "EUWMIN000PRC") {
      // precipitation inflow
      precipByYear[y] = (precipByYear[y] || 0) + v;
    } else if (TECHNOLOGY === "EUWINF000000") {
      // infiltration inflow
      infilByYear[y] = (infilByYear[y] || 0) + v;
    } else if (FUEL === "EUWEVT") {
      // evapotranspiration outflow
      evapByYear[y] = (evapByYear[y] || 0) + v;
    } else if (FUEL === "EUWGWT") {
      // groundwater outflow
      gwByYear[y] = (gwByYear[y] || 0) + v;
    } else if (FUEL === "EUWRUN") {
      // runout outflow
      runByYear[y] = (runByYear[y] || 0) + v;
    }
  }

  // 3) shared year axis
  const allYears = Array.from(
    new Set(
      [
        ...Object.keys(precipByYear),
        ...Object.keys(infilByYear),
        ...Object.keys(evapByYear),
        ...Object.keys(gwByYear),
        ...Object.keys(runByYear),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  // 4) build stacked series (inflows positive, outflows negative)
  const series = [
    {
      name: "Precipitation",
      type: "column",
      stack: "Inflows",
      data: allYears.map((y) => precipByYear[y] || 0),
    },
    {
      name: "EUWINF",
      type: "column",
      stack: "Outflows",
      data: allYears.map((y) => -(infilByYear[y] || 0)),
    },
    {
      name: "Evapotranspiration",
      type: "column",
      stack: "Outflows",
      data: allYears.map((y) => -(evapByYear[y] || 0)),
    },
    {
      name: "Groundwater",
      type: "column",
      stack: "Outflows",
      data: allYears.map((y) => -(gwByYear[y] || 0)),
    },
    {
      name: "Runout",
      type: "column",
      stack: "Outflows",
      data: allYears.map((y) => -(runByYear[y] || 0)),
    },
  ];

  // 5) friendly labels & colors
  const annotated = annotateLandCropSeries(series);

  // 6) write out
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    chart: { type: "column" },
    plotOptions: { column: { stacking: "normal" } },
    title: { text: "Annual Water Balance: Inflows & Outflows" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Volume (kt)" } },
    series: annotated,
  });

  const outFile = path.join(OUT_DIR, "water-balance.config.json");
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
