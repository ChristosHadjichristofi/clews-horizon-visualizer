import fs from "fs/promises";
import path from "path";
import merge from "lodash.merge";
import { splitTechnology, splitFuel, parseCsv, loadTemplate } from "./utils.js";
import {
  pivotWideBySuffix,
  getEmActAMap,
  getEmActBMap,
} from "./buildEmissions.js";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Energy");
const PJ_TO_TWH = 0.277778;

/**
 * Electricity: production (EUESEL) + demand (EUEFEL) + dummy CO₂
 */
export async function buildElectricityGenerationChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const [prodRows, demRows, emActRows, inputActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "Demand.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EmissionActivityRatio.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
  ]);

  // 1) Production by tech (electricity)
  const prodAgg = {};
  prodRows
    .map((r) => ({
      ...r,
      tech: splitTechnology(r.TECHNOLOGY),
      fuel: splitTechnology(r.FUEL), // assuming splitFuel same as splitTechnology on FUEL
    }))
    .filter(
      (r) =>
        r.tech.region === "EU" &&
        r.tech.module === "E" &&
        r.tech.sector === "EG" &&
        r.fuel.full === "EUESEL" &&
        r.tech.tech !== "000"
    )
    .forEach((r) => {
      const tWh = Number(r.VALUE) * PJ_TO_TWH;
      const code = r.TECHNOLOGY;
      prodAgg[code] ??= {};
      prodAgg[code][r.YEAR] = (prodAgg[code][r.YEAR] || 0) + tWh;
    });

  // 2) Demand
  const demAgg = {};
  demRows
    .map((r) => ({ ...r, fuel: splitTechnology(r.FUEL) }))
    .filter((r) => r.fuel.full === "EUESEL")
    .forEach((r) => {
      const tWh = Number(r.VALUE) * PJ_TO_TWH;
      demAgg[r.YEAR] = (demAgg[r.YEAR] || 0) + tWh;
    });

  // 3) CO₂ Emissions for electricity subset
  //   sum prodPJ × inputRatio × emitA + prodPJ × emitB
  const inputMap = pivotWideBySuffix(inputActRows, "EUEEG", splitTechnology);
  const emisAgg = {};
  prodRows
    .filter((r) => {
      const t = splitTechnology(r.TECHNOLOGY);
      const f = splitTechnology(r.FUEL);
      return (
        t.region === "EU" &&
        t.module === "E" &&
        t.sector === "EG" &&
        f.full === "EUESEL" &&
        t.tech !== "000"
      );
    })
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const suffix = splitTechnology(tech).tech;
      const year = r.YEAR;
      const prodPJ = +r.VALUE;

      const inputRatio = inputMap[suffix]?.[year] || 0;
      const emAMap = getEmActAMap(emActRows, suffix);
      const emBMap = getEmActBMap(emActRows, suffix);
      const emitA = emAMap[suffix]?.[year] || 0;
      const emitB = emBMap[suffix]?.[year] || 0;
      const mt = prodPJ * inputRatio * emitA + prodPJ * emitB;

      emisAgg[year] = (emisAgg[year] || 0) + mt;
    });

  // 4) Years axis
  const years = Array.from(
    new Set(
      [
        ...Object.values(prodAgg).flatMap(Object.keys),
        ...Object.keys(demAgg),
        ...Object.keys(emisAgg),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  // 5) Series
  const series = [
    ...Object.entries(prodAgg).map(([code, data]) => ({
      name: code,
      type: "column",
      data: years.map((y) => data[y] || 0),
    })),
    {
      name: "Demand",
      type: "line",
      data: years.map((y) => demAgg[y] || 0),
      marker: { enabled: false },
    },
    {
      name: "CO₂ Emissions",
      type: "line",
      yAxis: 1,
      data: years.map((y) => emisAgg[y] || 0),
      marker: { enabled: false },
    },
  ];

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
    series,
  });

  const outFile = path.join(
    OUT_DIR,
    "total-generation-electricity.config.json"
  );
  await fs.writeFile(outFile, JSON.stringify(config, null, 2));
  console.log("Wrote electricity config to", outFile);
}

/**
 * Heat: production (EUEHEA) + demand (EUEFEL)
 */
export async function buildHeatGenerationChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const [prodRows, demRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "Demand.csv")),
  ]);

  // 1) Production: only EU-EG heat techs, FUEL="EUEHEA", drop tech="000"
  const prodAgg = {};
  prodRows
    .map((r) => ({
      ...r,
      tech: splitTechnology(r.TECHNOLOGY),
      fuel: splitFuel(r.FUEL),
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
      const tWh = Number(r.VALUE) * PJ_TO_TWH;
      const code = r.tech.full;
      prodAgg[code] ??= {};
      prodAgg[code][r.YEAR] = (prodAgg[code][r.YEAR] || 0) + tWh;
    });

  // 2) Demand: only EU-27 final-energy demand, FUEL="EUEHEA"
  const demAgg = {};
  demRows
    .map((r) => ({ ...r, fuel: splitFuel(r.FUEL) }))
    .filter((r) => r.fuel.full === "EUEHEA")
    .forEach((r) => {
      const tWh = Number(r.VALUE) * PJ_TO_TWH;
      demAgg[r.YEAR] = (demAgg[r.YEAR] || 0) + tWh;
    });

  // 3) Years axis
  const years = Array.from(
    new Set(
      [
        ...Object.values(prodAgg).flatMap(Object.keys),
        ...Object.keys(demAgg),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  // 4) Series
  const series = [
    ...Object.entries(prodAgg).map(([code, data]) => ({
      name: code,
      type: "column",
      data: years.map((y) => data[y] || 0),
    })),
    {
      name: "Demand",
      type: "line",
      data: years.map((y) => demAgg[y] || 0),
      marker: { enabled: false },
    },
  ];

  // 5) Merge & write
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
