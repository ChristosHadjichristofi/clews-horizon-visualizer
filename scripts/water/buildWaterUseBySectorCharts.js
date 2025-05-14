import { parseCsv, loadTemplate } from "../utils/general.js";
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

export async function buildWaterUseBySectorCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, inputActRows } = await loadCsvs();

  const inputMap = {};
  for (const r of inputActRows) {
    if (
      r.TECHNOLOGY === "EUWDEMAGRSUR" ||
      r.TECHNOLOGY === "EUWDEMAGRGWT" ||
      r.TECHNOLOGY === "EUWTRNPWR000" ||
      r.TECHNOLOGY === "EUWTRNPUB000" ||
      r.TECHNOLOGY === "EUWTRNOTH000"
    ) {
      // for SUR we also check fuel
      const key =
        r.TECHNOLOGY === "EUWDEMAGRSUR"
          ? `${r.TECHNOLOGY}|${r.FUEL}`
          : r.TECHNOLOGY;
      inputMap[key] ??= {};
      for (const [k, v] of Object.entries(r)) {
        if (/^\d{4}$/.test(k)) inputMap[key][Number(k)] = Number(v);
      }
    }
  }

  // accumulate water use by sector
  const byYear = {
    Agriculture: {},
    Power: {},
    "Public Supply": {},
    Other: {},
  };

  for (const { TECHNOLOGY, FUEL, YEAR, VALUE } of prodRows) {
    const year = Number(YEAR);
    const prod = Number(VALUE);

    let sector = null;
    let ratio = 0;

    if (TECHNOLOGY === "EUWDEMAGRSUR" && FUEL === "EUWAGR") {
      sector = "Agriculture";
      ratio = inputMap[`${TECHNOLOGY}|EUWSUR`]?.[year] ?? 0;
    } else if (TECHNOLOGY === "EUWDEMAGRGWT" && FUEL === "EUWAGR") {
      sector = "Agriculture";
      ratio = 1;
    } else if (TECHNOLOGY === "EUWTRNPWR000") {
      sector = "Power";
      ratio = inputMap[TECHNOLOGY]?.[year] ?? 0;
    } else if (TECHNOLOGY === "EUWTRNPUB000") {
      sector = "Public Supply";
      ratio = inputMap[TECHNOLOGY]?.[year] ?? 0;
    } else if (TECHNOLOGY === "EUWTRNOTH000") {
      sector = "Other";
      ratio = inputMap[TECHNOLOGY]?.[year] ?? 0;
    }

    if (sector) {
      byYear[sector][year] = (byYear[sector][year] || 0) + prod * ratio;
    }
  }

  // shared year axis
  const allYears = Array.from(
    new Set(
      Object.values(byYear)
        .flatMap((m) => Object.keys(m))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // series
  const series = Object.entries(byYear).map(([sector, data]) => {
    let color;
    switch (sector) {
      case "Agriculture":
        color = "#4CAF50";
        break;
      case "Power":
        color = "#F44336";
        break;
      case "Public Supply":
        color = "#2196F3";
        break;
      case "Other":
        color = "#9E9E9E";
        break;
    }
    return {
      name: sector,
      type: "column",
      color,
      data: allYears.map((y) => data[y] || 0),
    };
  });

  // output
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    chart: { type: "column" },
    plotOptions: { column: { stacking: "normal" } },
    title: { text: "Annual Water Use by Sector" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Water use (kt)" } },
    series,
  });

  const outFile = path.join(OUT_DIR, "water-use-by-sector.config.json");
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
