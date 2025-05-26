import { parseCsv, loadTemplate } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Water");

const TECH_METADATA = {
  EUWMIN000PRC: { name: "Precipitation water resource", color: "#4FC3F7" },
  EUWDEMAGRSUR: {
    name: "Surface water supply for agriculture",
    color: "#81C784",
  },
  EUWDEMAGRGWT: {
    name: "Ground water supply for agriculture",
    color: "#66BB6A",
  },
  EUWDEMPWRSUR: {
    name: "Surface water supply for power plants",
    color: "#FFB74D",
  },
  EUWDEMPWRGWT: {
    name: "Ground water supply for power plants",
    color: "#FFA726",
  },
  EUWDEMPUBSUR: {
    name: "Surface water supply for public use",
    color: "#9575CD",
  },
  EUWDEMPUBGWT: {
    name: "Ground water supply for public use",
    color: "#7E57C2",
  },
  EUWDEMOTHSUR: {
    name: "Surface water supply for Other use",
    color: "#A1887F",
  },
  EUWDEMOTHGWT: { name: "Ground water supply for Other use", color: "#8D6E63" },
  EUWTRNPUB000: { name: "T&D for public water supply", color: "#29B6F6" },
  EUWTRNAGR000: { name: "T&D for agricultural water supply", color: "#66BB6A" },
  EUWTRNPWR000: { name: "T&D for power sector water supply", color: "#FFA726" },
  EUWTRNOTH000: { name: "T&D for Other water supply", color: "#8D6E63" },
  EUWDSA000000: { name: "Desalination technology", color: "#4DB6AC" },
  EUWMIN000SEA: { name: "Sea water resource", color: "#4FC3F7" },
  EUWUPS000SUR: {
    name: "Run Off to Surface water conversion",
    color: "#BA68C8",
  },
  EUWTRN000TRE: { name: "Water treatment plant", color: "#9575CD" },
  EUW000000ELC: { name: "ELC for water technologies", color: "#F06292" },
  EUWBKSPUB000: { name: "Backstop for Public water supply", color: "#29B6F6" },
  EUWBKSOTH000: { name: "Backstop for OTH water supply", color: "#A1887F" },
  EUWBKSAGR000: {
    name: "Backstop for Agricultural water supply",
    color: "#66BB6A",
  },
  EUWBKSPWR000: {
    name: "Backstop for Power sector water supply",
    color: "#FFA726",
  },
};

async function loadCsvs() {
  const [prodRows, inputActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
  ]);
  return { prodRows, inputActRows };
}

export async function buildWaterEnergyUseByEndUseCharts() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, inputActRows } = await loadCsvs();

  // 1) pivot input ratios for FUEL = EUWELC
  const inputMap = {};
  inputActRows
    .filter((r) => r.FUEL === "EUWELC")
    .forEach((r) => {
      inputMap[r.TECHNOLOGY] ??= {};
      Object.entries(r).forEach(([k, v]) => {
        if (/^\d{4}$/.test(k)) inputMap[r.TECHNOLOGY][Number(k)] = Number(v);
      });
    });

  // 2) pick all water‐module techs by prefix and build per‐tech time‐series
  const useByTech = {};
  for (const { TECHNOLOGY, YEAR, VALUE } of prodRows) {
    if (!/^EUW(?:DEM|TRN|DSA)/.test(TECHNOLOGY)) continue;
    const year = Number(YEAR);
    const prod = Number(VALUE);
    const ratio = inputMap[TECHNOLOGY]?.[year] ?? 0;
    const energy = prod * ratio;

    useByTech[TECHNOLOGY] ??= {};
    useByTech[TECHNOLOGY][year] = (useByTech[TECHNOLOGY][year] || 0) + energy;
  }

  // 3) build shared year axis
  const allYears = Array.from(
    new Set(
      Object.values(useByTech)
        .flatMap((byYear) => Object.keys(byYear))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // 4) build one column series per technology, using our metadata
  const series = Object.entries(useByTech).map(([tech, byYear]) => {
    const meta = TECH_METADATA[tech] || { name: tech, color: "#999999" };
    return {
      name: meta.name,
      type: "column",
      color: meta.color,
      data: allYears.map((y) => byYear[y] || 0),
    };
  });

  // 6) render to stacked‐bar
  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    chart: { type: "column" },
    plotOptions: { column: { stacking: "normal" } },
    title: { text: "Annual Energy Use in Water Module by Technology" },
    xAxis: { categories: allYears, title: { text: "Year" } },
    yAxis: { title: { text: "Energy Use (PJ)" } },
    series,
  });

  const outFile = path.join(OUT_DIR, "water-energy-use-by-end-use.config.json");
  await fs.writeFile(outFile, JSON.stringify(cfg, null, 2));
  console.log("Wrote", outFile);
}
