import fs from "fs/promises";
import path from "path";
import merge from "lodash.merge";
import {
  pivotLong,
  splitTechnology,
  parseCsv,
  loadTemplate,
} from "../utils/general.js";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Energy");

const colorMap = {
  WND: "#1f77b4",
  SOL: "#ff7f0e",
  SPV: "#2ca02c",
  GAS: "#9467bd",
  COA: "#8c564b",
  CHP: "#d62728",
  ELC: "#17becf", // both pumped-hydro and battery go under “ELC”
};

export async function buildTotalCapacity() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // 1) load CSVs
  const totalRows = await parseCsv(
    path.join(CSV_DIR, "TotalCapacityAnnual.csv")
  );
  const accumRows = await parseCsv(
    path.join(CSV_DIR, "AccumulatedNewCapacity.csv")
  );

  // 2) filter down to:
  //    – EU-E-EG generation codes OR EU-E-HG OR the two storage codes
  //    – and drop any tech whose 3-letter suffix is "000"
  const keep = (r) => {
    const { full, region, module, sector, tech } = splitTechnology(
      r.TECHNOLOGY
    );
    const isGen =
      region === "EU" && module === "E" && (sector === "EG" || sector === "HG");
    const isStorage = full === "EUESTELCPDHY" || full === "EUESTELCBT00";
    return (isGen || isStorage) && tech !== "000";
  };

  // 3) normalize rows to { YEAR, TECHNOLOGY (full code), VALUE }
  const prep = (rows) =>
    rows.filter(keep).map((r) => ({
      YEAR: r.YEAR,
      TECHNOLOGY: r.TECHNOLOGY,
      VALUE: +r.VALUE,
    }));

  const totalNorm = prep(totalRows);
  const newNorm = prep(accumRows);

  // 4) pivot into { years, series: [ { name, data: [...] }, … ] }
  const { years, series: totalSeries } = pivotLong(totalNorm, "YEAR");
  const { series: newSeries } = pivotLong(newNorm, "YEAR");

  // 5) compute existing = total – new
  const existingSeries = totalSeries.map((ts) => {
    const match = newSeries.find((ns) => ns.name === ts.name);
    const newData = match ? match.data : years.map(() => 0);
    return {
      name: ts.name,
      data: ts.data.map((v, i) => v - newData[i]),
    };
  });

  // 6) build Highcharts series, tagging (Existing)/(New)
  const combined = [
    ...existingSeries.map((s) => {
      const suffix = splitTechnology(s.name).tech;
      return {
        name: `${s.name} (Existing)`,
        type: "column",
        data: s.data,
        color: colorMap[suffix],
      };
    }),
    ...newSeries.map((s) => {
      const suffix = splitTechnology(s.name).tech;
      return {
        name: `${s.name} (New)`,
        type: "column",
        data: s.data,
        color: colorMap[suffix],
      };
    }),
  ];

  // 7) merge into template & write out
  const tpl = await loadTemplate("stackedBar");
  const config = merge({}, tpl, {
    title: { text: "Total Annual Capacity per Technology" },
    xAxis: { categories: years },
    series: combined,
  });

  const outFile = path.join(OUT_DIR, "total-annual-capacity.config.json");
  await fs.writeFile(outFile, JSON.stringify(config, null, 2));
  console.log("Wrote:", outFile);
}
