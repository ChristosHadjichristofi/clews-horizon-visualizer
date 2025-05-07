import { splitTechnology, parseCsv, loadTemplate } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Energy");

async function loadCsvs() {
  const [prodRows, emActRows, inputActRows] = await Promise.all([
    parseCsv("data/csv/ProductionByTechnologyAnnual.csv"),
    parseCsv("data/csv/exported/EmissionActivityRatio.csv"),
    parseCsv("data/csv/exported/InputActivityRatio.csv"),
  ]);
  return { prodRows, emActRows, inputActRows };
}

const isEUeg = (r) => {
  const t = splitTechnology(r.TECHNOLOGY);
  return t.region === "EU" && t.module === "E" && t.sector === "EG";
};

// Pivot a long table into { suffix: { year: value } }
// (for input‐ratios and similar)
export function pivotWideBySuffix(rows, codePrefix, splitFn) {
  const map = {};
  rows
    .filter((r) => !codePrefix || r.TECHNOLOGY.startsWith(codePrefix))
    .forEach((r) => {
      const suffix = splitFn(r.TECHNOLOGY).tech;
      map[suffix] ??= {};
      Object.entries(r).forEach(([col, val]) => {
        if (/^[0-9]{4}$/.test(col)) map[suffix][col] = Number(val);
      });
    });
  return map;
}

// Pivot any filtered emission‐activity rows into { suffix: { year: value } }
export function pivotBySuffix(rows, splitFn) {
  const map = {};
  rows.forEach((r) => {
    const suffix = splitFn(r.TECHNOLOGY).tech;
    map[suffix] ??= {};
    Object.entries(r).forEach(([col, val]) => {
      if (/^[0-9]{4}$/.test(col)) map[suffix][col] = Number(val);
    });
  });
  return map;
}

// 1) Emit‑A: dynamic prefix = EUEPS{tech}, EMISSION = EUCO2_ETS
export function getEmActAMap(emActRows, suffix) {
  const prefix = `EUEPS${suffix}`;
  const filtered = emActRows.filter(
    (r) => r.EMISSION === "EUCO2_ETS" && r.TECHNOLOGY.startsWith(prefix)
  );
  return pivotBySuffix(filtered, splitTechnology);
}

// 2) Emit‑B: exact key = EUEGG{tech}PPCS, EMISSION = EUCO2
export function getEmActBMap(emActRows, suffix) {
  const key = `EUEGG${suffix}PPCS`;
  const filtered = emActRows.filter(
    (r) => r.EMISSION === "EUCO2" && r.TECHNOLOGY === key
  );
  return pivotBySuffix(filtered, splitTechnology);
}

// 3.a) Annual CO₂ Emissions by technology (sum over all years)
export async function buildEmissionsByTechChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, emActRows, inputActRows } = await loadCsvs();

  const inputMap = pivotWideBySuffix(inputActRows, "EUEEG", splitTechnology);
  const emissionsMap = {};

  prodRows.filter(isEUeg).forEach((r) => {
    const tech = r.TECHNOLOGY;
    const suffix = splitTechnology(tech).tech;
    const year = r.YEAR;
    const prodPJ = +r.VALUE;

    const inputRatio = inputMap[suffix]?.[year] || 0;
    const emAMap = getEmActAMap(emActRows, suffix);
    const emBMap = getEmActBMap(emActRows, suffix);
    const emitRatioA = emAMap[suffix]?.[year] || 0;
    const emitRatioB = emBMap[suffix]?.[year] || 0;

    const mt = prodPJ * inputRatio * emitRatioA + prodPJ * emitRatioB;
    emissionsMap[tech] = (emissionsMap[tech] || 0) + mt;
  });

  const techs = Object.keys(emissionsMap).sort();
  const data = techs.map((t) => emissionsMap[t]);

  const tpl = await loadTemplate("column");
  const config = merge({}, tpl, {
    title: { text: "Annual CO₂ Emissions by Technology" },
    xAxis: { categories: techs, title: { text: "Technology" } },
    yAxis: { title: { text: "Mt CO₂" } },
    series: [{ name: "Total Emissions", type: "column", data }],
  });

  await fs.writeFile(
    path.join(OUT_DIR, "emissions-by-tech.config.json"),
    JSON.stringify(config, null, 2)
  );
  console.log("Wrote emissions-by-tech.config.json");
}

// 3.b) Annual CO₂ Emissions by Year & Technology (nested series)
export async function buildEmissionsByYearByTechChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, emActRows, inputActRows } = await loadCsvs();

  const inputMap = pivotWideBySuffix(inputActRows, "EUEEG", splitTechnology);
  const nested = {};

  prodRows.filter(isEUeg).forEach((r) => {
    const tech = r.TECHNOLOGY;
    const suffix = splitTechnology(tech).tech;
    const year = r.YEAR;
    const prodPJ = +r.VALUE;

    const inputRatio = inputMap[suffix]?.[year] || 0;
    const emAMap = getEmActAMap(emActRows, suffix);
    const emBMap = getEmActBMap(emActRows, suffix);
    const emitRatioA = emAMap[suffix]?.[year] || 0;
    const emitRatioB = emBMap[suffix]?.[year] || 0;

    const mt = prodPJ * inputRatio * emitRatioA + prodPJ * emitRatioB;
    nested[tech] ??= {};
    nested[tech][year] = (nested[tech][year] || 0) + mt;
  });

  const techs = Object.keys(nested).sort();
  const years = Array.from(
    new Set(techs.flatMap((t) => Object.keys(nested[t])))
  )
    .map(Number)
    .sort((a, b) => a - b)
    .map(String);

  const series = techs.map((t) => ({
    name: t,
    type: "column",
    data: years.map((y) => nested[t][y] || 0),
  }));

  const tpl = await loadTemplate("stackedBar");
  const config = merge({}, tpl, {
    title: { text: "Annual CO₂ Emissions by Year & Technology" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Mt CO₂" } },
    series,
  });

  await fs.writeFile(
    path.join(OUT_DIR, "emissions-by-year-by-tech.config.json"),
    JSON.stringify(config, null, 2)
  );
  console.log("Wrote emissions-by-year-by-tech.config.json");
}
