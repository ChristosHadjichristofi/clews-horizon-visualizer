import {
  parseCsv,
  loadTemplate,
  annotateLandCropSeries,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Land");

async function loadCsvs() {
  const [landListRows, prodRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "exported/LandModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
  ]);
  return { landListRows, prodRows };
}

const friendlyName = {
  BRL: "Barley",
  POT: "Potatoes",
  GRA: "Grapes",
  MAI: "Maize",
  OAT: "Oats",
  OLI: "Olives",
  OTH: "Other crops",
  RAP: "Rapeseed",
  RYE: "Rye",
  SUN: "Sunflower",
  WHE: "Wheat",
};

const cropColor = {
  BRL: "#DAA520",
  POT: "#FF6347",
  GRA: "#800080",
  MAI: "#FFA500",
  OAT: "#DEB887",
  OLI: "#808000",
  OTH: "#A9A9A9",
  RAP: "#FFFF00",
  RYE: "#D2B48C",
  SUN: "#FFD700",
  WHE: "#F5DEB3",
};

export async function buildCropTradeCharts() {
  // ensure output dir
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { landListRows, prodRows } = await loadCsvs();

  // 1) pick out imports vs exports and 3-letter codes
  const cropPairs = landListRows
    .filter(
      (r) =>
        r.classifier === "Technology" &&
        (r.Type === "Crop Imports" || r.Type === "Crop Exports")
    )
    .map((r) => {
      const tech = r.Name; // e.g. "EULIMPMAI000"
      const crop = tech.slice(6, 9); // e.g. "MAI"
      return {
        trade: r.Type === "Crop Imports" ? "imports" : "exports",
        crop,
        tech,
        fuel: r["Output Name"], // e.g. "IMCMAI"
      };
    });

  // 2) aggregate totals & breakdowns
  const tradeData = {
    imports: { totalByYear: {}, byCrop: {} },
    exports: { totalByYear: {}, byCrop: {} },
  };

  for (const r of prodRows) {
    const p = cropPairs.find(
      (x) => x.tech === r.TECHNOLOGY && r.FUEL.slice(-3) === x.crop
    );
    if (!p) continue;
    const y = r.YEAR;
    const v = Number(r.VALUE);
    const td = tradeData[p.trade];
    td.totalByYear[y] = (td.totalByYear[y] || 0) + v;
    td.byCrop[p.crop] ||= {};
    td.byCrop[p.crop][y] = (td.byCrop[p.crop][y] || 0) + v;
  }

  // 3) list of all years seen, sorted
  const allYears = Array.from(
    new Set(
      Object.values(tradeData)
        .flatMap((t) => Object.keys(t.totalByYear))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // 4) load column template
  const tpl = await loadTemplate("column");

  // 5) write two configs
  for (const trade of ["imports", "exports"]) {
    const td = tradeData[trade];
    const capitalized = trade[0].toUpperCase() + trade.slice(1);

    // 1) top‐level: one color for all bars
    const mainSeries = [
      {
        name: capitalized,
        color: "#7cb5ec",
        data: allYears.map((year) => ({
          name: String(year),
          y: td.totalByYear[year] || 0,
          drilldown: `${trade}-${year}`,
        })),
      },
    ];

    // 2) drilldown: different colours per bar
    const drilldownSeries = allYears.map((year) => ({
      id: `${trade}-${year}`,
      name: `${capitalized} ${year}`,
      type: "column",
      data: Object.entries(td.byCrop).map(([crop, byYear]) => ({
        // use friendly name if available, otherwise the code
        name: friendlyName[crop] || crop,
        y: byYear[year] || 0,
        color: cropColor[crop] || "#888888",
      })),
    }));

    const config = merge({}, tpl, {
      chart: { type: "column" },
      title: { text: `Crop ${capitalized} by Crop Type` },
      subtitle: {
        text: `${capitalized} aggregated by year; click for breakdown`,
      },
      xAxis: {
        type: "category",
        categories: allYears.map((y) => String(y)),
        title: { text: "Year" },
        tickInterval: 1,
      },
      yAxis: { title: { text: `Value (${trade}) (kt)` } },
      series: mainSeries,
      drilldown: { series: drilldownSeries },
    });

    const fileName = `crop-${trade}-by-code.config.json`;
    await fs.writeFile(
      path.join(OUT_DIR, fileName),
      JSON.stringify(config, null, 2)
    );
    console.log("Wrote", fileName);
  }
}
