// scripts/buildLandUseEmissionsCharts.js

import { parseCsv, loadTemplate } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Land");

async function loadCsvs() {
  const [landListRows, prodRows, inputActRows, outputActRows, emActRows] =
    await Promise.all([
      parseCsv(path.join(CSV_DIR, "exported/LandModule_Tech_List.csv")),
      parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
      parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
      parseCsv(path.join(CSV_DIR, "exported/OutputActivityRatio.csv")),
      parseCsv(path.join(CSV_DIR, "exported/EmissionActivityRatio.csv")),
    ]);
  return { landListRows, prodRows, inputActRows, outputActRows, emActRows };
}

export async function buildLandUseEmissionsCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { landListRows, prodRows, inputActRows, outputActRows, emActRows } =
    await loadCsvs();

  // 1) pick out the "Land potential for crops" techs
  const pairs = landListRows
    .filter(
      (r) =>
        r.classifier === "Technology" && r.Type === "Land potential for crops"
    )
    .map((r) => ({
      tech: r.Name,
      code: r.Name.slice(6, 9),
    }));

  // 2) pivot InputActivityRatio for FUEL="EULADSL"
  const inputMap = {};
  inputActRows
    .filter((r) => r.FUEL === "EULADSL")
    .forEach((r) => {
      inputMap[r.TECHNOLOGY] ??= {};
      Object.entries(r).forEach(([k, v]) => {
        if (/^\d{4}$/.test(k)) inputMap[r.TECHNOLOGY][k] = Number(v);
      });
    });

  // 3) pivot OutputActivityRatio
  const outputMap = {};
  outputActRows.forEach((r) => {
    outputMap[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([k, v]) => {
      if (/^\d{4}$/.test(k)) outputMap[r.TECHNOLOGY][k] = Number(v);
    });
  });

  // 4) pivot EmissionActivityRatio
  const emMap = {};
  emActRows.forEach((r) => {
    emMap[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([k, v]) => {
      if (/^\d{4}$/.test(k)) emMap[r.TECHNOLOGY][k] = Number(v);
    });
  });

  // 5) compute
  const emissionsByTechYear = {};
  let matchCount = 0;
  prodRows
    .filter((r) =>
      pairs.some((p) => r.TECHNOLOGY === p.tech && r.FUEL.slice(-3) === p.code)
    )
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const year = String(r.YEAR);
      const prod = Number(r.VALUE);
      const inp = inputMap[tech]?.[year] ?? 0;
      const outp = outputMap[tech]?.[year] ?? 1;
      const efact = emMap[tech]?.[year] ?? 0;

      const energy = (prod * inp) / outp;
      const emissions = energy * efact;

      matchCount++;
      emissionsByTechYear[tech] ??= {};
      emissionsByTechYear[tech][year] =
        (emissionsByTechYear[tech][year] || 0) + emissions;
    });

  // 6) aggregate total emissions per year
  const totalEmissionsByYear = {};
  Object.values(emissionsByTechYear).forEach((yearMap) =>
    Object.entries(yearMap).forEach(([year, val]) => {
      totalEmissionsByYear[year] = (totalEmissionsByYear[year] || 0) + val;
    })
  );

  // 7) sort years
  const allYears = Object.keys(totalEmissionsByYear)
    .map(Number)
    .sort((a, b) => a - b);

  // 8) build config
  const tpl = await loadTemplate("line");
  const series = [
    {
      name: "Land Use Emissions",
      type: "line",
      data: allYears.map((y) => totalEmissionsByYear[y] || 0),
      marker: { enabled: true },
    },
  ];
  const config = merge({}, tpl, {
    title: { text: "Annual Land Use GHG Emissions" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Emissions (MtCO₂-eq)" } },
    series,
  });

  // 9) write out
  const fileName = "land-use-emissions.config.json";
  await fs.writeFile(
    path.join(OUT_DIR, fileName),
    JSON.stringify(config, null, 2)
  );
  console.log("Wrote", fileName);
}
