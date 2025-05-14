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
  const [prodRows, inputActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
  ]);
  return { prodRows, inputActRows };
}

export async function buildWaterBalanceCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, inputActRows } = await loadCsvs();

  // Initialize accumulators
  const precipByYear = {};
  const infilByYear = {};
  const evapByYear = {};
  const gwByYear = {};
  const runByYear = {};
  const desalByYear = {};
  const demandByYear = {};
  const outflowByYear = {};

  // Build input ratio map
  const inputMap = {};
  for (const r of inputActRows) {
    const tech = r.TECHNOLOGY;
    const key = tech === "EUWDEMAGRSUR" ? `${tech}|${r.FUEL}` : tech;

    inputMap[key] ??= {};
    for (const [k, v] of Object.entries(r)) {
      if (/^\d{4}$/.test(k)) inputMap[key][Number(k)] = Number(v);
    }
  }

  // Classify production rows
  for (const { TECHNOLOGY, FUEL, YEAR, VALUE } of prodRows) {
    const y = Number(YEAR);
    const v = Number(VALUE);

    if (TECHNOLOGY === "EUWMIN000PRC") {
      precipByYear[y] = (precipByYear[y] || 0) + v;
    } else if (TECHNOLOGY === "EUWINF000000") {
      infilByYear[y] = (infilByYear[y] || 0) + v;
    } else if (FUEL === "EUWEVT") {
      evapByYear[y] = (evapByYear[y] || 0) + v;
    } else if (FUEL === "EUWGWT") {
      gwByYear[y] = (gwByYear[y] || 0) + v;
    } else if (FUEL === "EUWRUN") {
      runByYear[y] = (runByYear[y] || 0) + v;
    } else if (TECHNOLOGY === "EUWDSA000000") {
      desalByYear[y] = (desalByYear[y] || 0) + v;
    } else if (TECHNOLOGY === "EUWOUT000000") {
      outflowByYear[y] = (outflowByYear[y] || 0) + v;
    }

    // Add demand as inflow
    let ratio = 0;
    if (TECHNOLOGY === "EUWDEMAGRSUR" && FUEL === "EUWAGR") {
      ratio = inputMap[`${TECHNOLOGY}|EUWSUR`]?.[y] ?? 0;
    } else if (TECHNOLOGY === "EUWDEMAGRGWT" && FUEL === "EUWAGR") {
      ratio = 1;
    } else if (
      TECHNOLOGY === "EUWTRNPWR000" ||
      TECHNOLOGY === "EUWTRNPUB000" ||
      TECHNOLOGY === "EUWTRNOTH000"
    ) {
      ratio = inputMap[TECHNOLOGY]?.[y] ?? 0;
    }

    if (ratio > 0) {
      demandByYear[y] = (demandByYear[y] || 0) + v * ratio;
    }
  }

  // Shared year axis
  const allYears = Array.from(
    new Set(
      [
        ...Object.keys(precipByYear),
        ...Object.keys(infilByYear),
        ...Object.keys(evapByYear),
        ...Object.keys(gwByYear),
        ...Object.keys(runByYear),
        ...Object.keys(demandByYear),
        ...Object.keys(desalByYear),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  // Build stacked series
  const series = [
    {
      name: "Precipitation",
      type: "column",
      stack: "InOut",
      data: allYears.map((y) => precipByYear[y] || 0),
    },
    {
      name: "Infiltration",
      type: "column",
      stack: "InOut",
      data: allYears.map((y) => infilByYear[y] || 0),
    },
    {
      name: "Desalination",
      type: "column",
      stack: "InOut",
      data: allYears.map((y) => desalByYear[y] || 0),
    },
    {
      name: "Water Demand",
      type: "column",
      stack: "InOut",
      data: allYears.map((y) => -(demandByYear[y] || 0)),
    },
    {
      name: "Evapotranspiration",
      type: "column",
      stack: "InOut",
      data: allYears.map((y) => -(evapByYear[y] || 0)),
    },
    {
      name: "Groundwater",
      type: "column",
      stack: "InOut",
      data: allYears.map((y) => -(gwByYear[y] || 0)),
    },
    {
      name: "Runout",
      type: "column",
      stack: "InOut",
      data: allYears.map((y) => -(runByYear[y] || 0)),
    },
    {
      name: "Outflow",
      type: "column",
      stack: "InOut",
      data: allYears.map((y) => -(outflowByYear[y] || 0)),
    },
  ];

  // Annotate with colors etc
  const annotated = annotateLandCropSeries(series);

  // Final chart config
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
