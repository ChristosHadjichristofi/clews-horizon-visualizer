// scripts/buildOverarchingEmissions.js

import fs from "fs/promises";
import path from "path";
import merge from "lodash.merge";
import { parseCsv, loadTemplate } from "../utils/general.js";

const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Overarching");

async function loadJson(sub, file) {
  const txt = await fs.readFile(
    path.resolve(process.cwd(), `data/chartConfigs/${sub}/${file}`),
    "utf-8"
  );
  return JSON.parse(txt);
}

async function loadConfigs() {
  return {
    buildings: await loadJson(
      "Buildings",
      "buildings-ghg-emissions.config.json"
    ),
    industry: await loadJson(
      "Industry",
      "industry-emissions-total.config.json"
    ),
    transport: await loadJson(
      "Transport",
      "transport-emissions-by-mode.config.json"
    ),
    electricity: await loadJson(
      "Energy",
      "total-generation-electricity.config.json"
    ),
  };
}

// reindex one series onto the shared `years` axis
function reindex(origYears, origData, years) {
  const map = {};
  origYears.forEach((y, i) => {
    map[String(y)] = origData[i] || 0;
  });
  return years.map((y) => map[String(y)] || 0);
}

export async function buildOverarchingEmissionsChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { buildings, industry, transport, electricity } = await loadConfigs();

  // 1) build shared years
  const yearSet = new Set();
  [buildings, industry, transport, electricity].forEach((cfg) =>
    cfg.xAxis.categories.forEach((y) => yearSet.add(Number(y)))
  );
  const years = Array.from(yearSet)
    .sort((a, b) => a - b)
    .map(String);

  // 2) reindex each sector onto that axis
  const bld = reindex(
    buildings.xAxis.categories,
    buildings.series[0].data,
    years
  );
  const ind = reindex(
    industry.xAxis.categories,
    industry.series[0].data,
    years
  );

  // transport: sum all its modes
  const trpTotals = years.reduce((acc, y) => ((acc[y] = 0), acc), {});
  transport.series.forEach((s) => {
    reindex(transport.xAxis.categories, s.data, years).forEach(
      (v, i) => (trpTotals[years[i]] += v)
    );
  });
  const trp = years.map((y) => trpTotals[y]);

  // electricity: pick the CO₂‐emissions series
  const elecSer = electricity.series.find(
    (s) => s.yAxis === 1 || /CO₂/i.test(s.name)
  );
  const elec = reindex(electricity.xAxis.categories, elecSer.data, years);

  // 3) assemble as stacked columns
  const series = [
    { name: "Buildings", type: "column", data: bld },
    { name: "Industry", type: "column", data: ind },
    { name: "Transport", type: "column", data: trp },
    { name: "Electricity", type: "column", data: elec },
  ];

  // 4) merge into the stacked‐bar template
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    title: { text: "Annual GHG Emissions by Sector – All Modules" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Emissions (Mt CO₂-eq)" } },
    plotOptions: {
      column: { stacking: "normal" },
    },
    series,
  });

  // 5) write out
  const outFile = path.join(OUT_DIR, "overarching-emissions.config.json");
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
