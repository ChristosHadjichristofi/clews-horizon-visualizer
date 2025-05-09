import fs from "fs/promises";
import path from "path";
import merge from "lodash.merge";
import {
  splitTechnology,
  parseCsv,
  loadTemplate,
  annotateSeriesFromCsv,
} from "../utils/general.js";
import {
  pivotWideBySuffix,
  getEmActAMap,
  getEmActBMap,
} from "./buildEmissions.js";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Energy");
const PJ_TO_TWH = 0.277778;

function pivotByTechnology(rows) {
  const map = {};
  rows.forEach((r) => {
    map[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([col, val]) => {
      if (/^\d{4}$/.test(col)) map[r.TECHNOLOGY][col] = Number(val);
    });
  });
  return map;
}

// load all four CSVs
async function loadCsvs() {
  const [prodRows, techListRows, emActRows, inputActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EmissionActivityRatio.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
  ]);
  return { prodRows, techListRows, emActRows, inputActRows };
}

export async function buildElectricityGenerationChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, techListRows, emActRows, inputActRows } = await loadCsvs();

  // 1) Production by tech (electricity)
  const prodAgg = {};
  prodRows
    .map((r) => ({
      ...r,
      tech: splitTechnology(r.TECHNOLOGY),
      fuel: splitTechnology(r.FUEL),
    }))
    .filter(
      (r) =>
        (r.tech.region === "EU" &&
          r.tech.module === "E" &&
          (r.tech.sector === "EG" || r.tech.sector === "HG") &&
          r.fuel.full === "EUESEL" &&
          r.tech.tech !== "000") ||
        r.TECHNOLOGY === "EUEGNELCXXIC"
    )
    .forEach((r) => {
      const tWh = Number(r.VALUE) * PJ_TO_TWH;
      prodAgg[r.TECHNOLOGY] ??= {};
      prodAgg[r.TECHNOLOGY][r.YEAR] =
        (prodAgg[r.TECHNOLOGY][r.YEAR] || 0) + tWh;
    });

  // 2) demand by tech: use EnergyModule_Tech_List to pick all techs with Input="EUEFEL" or Output="EUEXEL" or "EUEHY2"
  const demandTechs = techListRows
    .filter(
      (r) =>
        r["Input code"] === "EUEFEL" ||
        r["Output code"] === "EUEXEL" ||
        r["Output code"] === "EUEHY2"
    )
    .map((r) => r["Technology code"]);

  const inputMap = pivotByTechnology(inputActRows);

  const demAgg = {};
  prodRows
    .filter((r) => demandTechs.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const year = r.YEAR;
      const prodPJ = +r.VALUE;
      const ratio = inputMap[r.TECHNOLOGY]?.[year] || 0;
      const finalPJ = prodPJ * ratio;
      demAgg[year] = (demAgg[year] || 0) + finalPJ * PJ_TO_TWH; // convert PJ→TWh
    });

  // 3) CO₂ Emissions on top of generation
  const inputMapCO2 = pivotWideBySuffix(inputActRows, "EUEEG", splitTechnology);
  const emisAgg = {};
  prodRows
    .filter((r) => {
      const t = splitTechnology(r.TECHNOLOGY);
      const f = splitTechnology(r.FUEL);
      return (
        t.region === "EU" &&
        t.module === "E" &&
        (t.sector === "EG" || t.sector === "HG") &&
        f.full === "EUESEL" &&
        t.tech !== "000"
      );
    })
    .forEach((r) => {
      const suffix = splitTechnology(r.TECHNOLOGY).tech;
      const year = r.YEAR;
      const prodPJ = +r.VALUE;
      const inputRatio = inputMapCO2[suffix]?.[year] || 0;
      const emAMap = getEmActAMap(emActRows, suffix);
      const emBMap = getEmActBMap(emActRows, suffix);
      const emitA = emAMap[suffix]?.[year] || 0;
      const emitB = emBMap[suffix]?.[year] || 0;
      const mt = prodPJ * inputRatio * emitA + prodPJ * emitB;
      emisAgg[year] = (emisAgg[year] || 0) + mt;
    });

  // 4) Shared years axis
  const years = Array.from(
    new Set(
      [
        ...Object.values(prodAgg).flatMap(Object.keys),
        ...Object.keys(demAgg),
        ...Object.keys(emisAgg),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  // 5) Build Highcharts series
  const series = [
    ...Object.entries(prodAgg).map(([tech, data]) => ({
      name: tech,
      type: "column",
      data: years.map((y) => data[y] || 0),
    })),
    {
      name: "Demand",
      type: "line",
      data: years.map((y) => demAgg[y] || 0),
      marker: { enabled: true },
    },
    {
      name: "CO₂ Emissions",
      type: "line",
      yAxis: 1,
      data: years.map((y) => emisAgg[y] || 0),
      marker: { enabled: true },
    },
  ];

  const seriesAnnotated = await annotateSeriesFromCsv(series);

  // 6) Merge & write
  const tpl = await loadTemplate("dualAxis");
  const config = merge({}, tpl, {
    plotOptions: { column: { stacking: "normal" } },
    title: { text: "Total Annual Generation per Technology – Electricity" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: [
      { title: { text: "Electricity (TWh)" } },
      { title: { text: "CO₂ Emissions (MtCO₂)" }, opposite: true },
    ],
    series: seriesAnnotated,
  });

  const outFile = path.join(
    OUT_DIR,
    "total-generation-electricity.config.json"
  );
  await fs.writeFile(outFile, JSON.stringify(config, null, 2));
  console.log("Wrote electricity config to", outFile);
}

export async function buildHeatGenerationChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, techListRows, inputActRows } = await loadCsvs();

  // 1) Production: by TECHNOLOGY (not by fuel!)
  const prodAgg = {};
  prodRows
    .map((r) => ({
      ...r,
      tech: splitTechnology(r.TECHNOLOGY),
      fuel: splitTechnology(r.FUEL),
    }))
    .filter(
      (r) =>
        r.tech.region === "EU" &&
        r.tech.module === "E" &&
        (r.tech.sector === "EG" || r.tech.sector === "HG") &&
        r.fuel.full === "EUEHEA" &&
        r.tech.tech !== "000"
    )
    .forEach((r) => {
      const code = r.TECHNOLOGY;
      const tWh = Number(r.VALUE) * PJ_TO_TWH;
      prodAgg[code] ??= {};
      prodAgg[code][r.YEAR] = (prodAgg[code][r.YEAR] || 0) + tWh;
    });

  // 2) Final‐energy demand: pick techs whose Input code = EUEHEA
  const demandHeatTechs = techListRows
    .filter((r) => r["Input code"] === "EUEHEA")
    .map((r) => r["Technology code"]);

  const inputMap = pivotByTechnology(inputActRows);
  const demAgg = {};
  prodRows
    .filter((r) => demandHeatTechs.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const year = r.YEAR;
      const prodPJ = +r.VALUE;
      const ratio = inputMap[r.TECHNOLOGY]?.[year] || 0;
      demAgg[year] = (demAgg[year] || 0) + prodPJ * ratio * PJ_TO_TWH;
    });

  // 3) shared years axis
  const years = Array.from(
    new Set(
      [
        ...Object.values(prodAgg).flatMap(Object.keys),
        ...Object.keys(demAgg),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  // 4) build raw series (now keyed by TECHNOLOGY code)
  const rawSeries = [
    // one column series per TECHNOLOGY
    ...Object.entries(prodAgg).map(([tech, data]) => ({
      name: tech,
      type: "column",
      data: years.map((y) => data[y] || 0),
    })),
    // plus the demand line
    {
      name: "Final-energy Demand",
      type: "line",
      data: years.map((y) => demAgg[y] || 0),
      marker: { enabled: true },
    },
  ];

  // 5) annotate & reorder from OrderAndColor.csv
  const series = await annotateSeriesFromCsv(rawSeries);

  // 6) merge into dualAxis template & write out
  const tpl = await loadTemplate("dualAxis");
  const config = merge({}, tpl, {
    plotOptions: { column: { stacking: "normal" } },
    title: { text: "Total Annual Generation per Technology – Heat" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: [{ title: { text: "Heat (TWh)" } }],
    series,
  });

  await fs.writeFile(
    path.join(OUT_DIR, "total-generation-heat.config.json"),
    JSON.stringify(config, null, 2)
  );
  console.log("Wrote heat config");
}
