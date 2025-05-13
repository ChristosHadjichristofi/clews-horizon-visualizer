import {
  splitTechnology,
  parseCsv,
  loadTemplate,
  annotateSeriesFromCsv,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Energy");

// — these helpers stay exactly as before —
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

export function getEmActAMap(emActRows, suffix) {
  const prefix = `EUEPS${suffix}`;
  const filtered = emActRows.filter(
    (r) => r.EMISSION === "EUCO2_ETS" && r.TECHNOLOGY.startsWith(prefix)
  );
  return pivotBySuffix(filtered, splitTechnology);
}

export function getEmActBMap(emActRows, suffix) {
  const key = `EUEGG${suffix}PPCS`;
  const filtered = emActRows.filter(
    (r) => r.EMISSION === "EUCO2" && r.TECHNOLOGY === key
  );
  return pivotBySuffix(filtered, splitTechnology);
}

// — now the fixed chart builder —
export async function buildEmissionsByYearByTechChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const [prodRows, emActRows, inputActRows] = await Promise.all([
    parseCsv("data/csv/ProductionByTechnologyAnnual.csv"),
    parseCsv("data/csv/exported/EmissionActivityRatio.csv"),
    parseCsv("data/csv/exported/InputActivityRatio.csv"),
  ]);

  // pivot input ratios by *suffix*
  const inputMap = pivotWideBySuffix(inputActRows, "EUEEG", splitTechnology);

  // accumulate MtCO₂ per (tech, year) — **only** for electricity fuel
  const nested = {};
  prodRows
    .filter((r) => {
      const t = splitTechnology(r.TECHNOLOGY);
      const f = splitTechnology(r.FUEL);
      return (
        // same filter as your electricity chart
        t.region === "EU" &&
        t.module === "E" &&
        (t.sector === "EG" || t.sector === "HG") &&
        f.full === "EUESEL" &&
        t.tech !== "000"
      );
    })
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const suffix = splitTechnology(tech).tech;
      const year = String(r.YEAR);
      const raw = Number(r.VALUE);

      // exactly the same MtCO₂ calc as in buildElectricityGenerationChart
      const p = raw * (inputMap[suffix]?.[year] || 0);
      const eA = getEmActAMap(emActRows, suffix)[suffix]?.[year] || 0;
      const eB = getEmActBMap(emActRows, suffix)[suffix]?.[year] || 0;
      const emissions = p * eA + p * eB;

      nested[tech] ??= {};
      nested[tech][year] = (nested[tech][year] || 0) + emissions;
    });

  // turn that into one series per tech
  const techs = Object.keys(nested).sort();
  const years = Array.from(
    new Set(techs.flatMap((t) => Object.keys(nested[t])))
  )
    .map(Number)
    .sort((a, b) => a - b)
    .map(String);

  const rawSeries = techs.map((t) => ({
    name: t,
    type: "column",
    data: years.map((y) => nested[t][y] || 0),
  }));

  const series = await annotateSeriesFromCsv(rawSeries);

  // merge into your stackedBar template
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
