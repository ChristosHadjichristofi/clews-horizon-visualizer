import {
  parseCsv,
  loadTemplate,
  annotateTechSeries,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Buildings");

// the three renovation‐activity tech codes
const RENOVATION_TECHS = ["EUEBD000EELO", "EUEBD000EEME", "EUEBD000EEHI"];

export async function buildBuildingsRenovationSavingsChart() {
  // 1) ensure output dir
  await fs.mkdir(OUT_DIR, { recursive: true });

  // 2) load production rows
  const prodRows = await parseCsv(
    path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")
  );

  // 3) aggregate savings (VALUE) by tech → year
  const savings = {}; // { [tech]: { [year]: value } }
  prodRows
    .filter((r) => RENOVATION_TECHS.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const year = r.YEAR;
      const val = Number(r.VALUE);
      savings[tech] ??= {};
      savings[tech][year] = (savings[tech][year] || 0) + val;
    });

  // 4) build sorted years axis
  const years = Array.from(
    new Set(
      Object.values(savings)
        .flatMap((byYear) => Object.keys(byYear))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // 5) make one series per tech
  const series = RENOVATION_TECHS.map((tech) => ({
    name: tech,
    type: "column",
    data: years.map((y) => savings[tech]?.[y] || 0),
  }));

  const annotatedSeries = await annotateTechSeries(series);

  // 6) load template, merge & write
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    title: {
      text: "Useful Energy Savings by Renovation Activity",
    },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Energy Savings (PJ)" } },
    series: annotatedSeries,
  });

  const outFile = path.join(
    OUT_DIR,
    "buildings-renovation-savings.config.json"
  );
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
