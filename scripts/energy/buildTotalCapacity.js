import fs from "fs/promises";
import path from "path";
import merge from "lodash.merge";
import {
  pivotLong,
  splitTechnology,
  parseCsv,
  annotateSeriesFromCsv,
  loadTemplate,
} from "../utils/general.js";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Energy");

export async function buildTotalCapacity() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // 1) load CSVs
  const totalRows = await parseCsv(
    path.join(CSV_DIR, "TotalCapacityAnnual.csv")
  );
  const accumRows = await parseCsv(
    path.join(CSV_DIR, "AccumulatedNewCapacity.csv")
  );

  // 2) filter
  const keep = (r) => {
    const { full, region, module, sector, tech } = splitTechnology(
      r.TECHNOLOGY
    );
    const isGen =
      region === "EU" && module === "E" && (sector === "EG" || sector === "HG");
    const isStorage = full === "EUESTELCPDHY" || full === "EUESTELCBT00";
    return (isGen || isStorage) && tech !== "000";
  };

  // 3) normalize
  const prep = (rows) =>
    rows.filter(keep).map((r) => ({
      YEAR: r.YEAR,
      TECHNOLOGY: r.TECHNOLOGY,
      VALUE: +r.VALUE,
    }));
  const totalNorm = prep(totalRows);
  const newNorm = prep(accumRows);

  // 4) pivot
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

  // 6) build raw combined WITHOUT any colors
  const combined = [
    ...existingSeries.map((s) => ({
      name: `${s.name} (Existing)`,
      type: "column",
      data: s.data,
    })),
    ...newSeries.map((s) => ({
      name: `${s.name} (New)`,
      type: "column",
      data: s.data,
    })),
  ];

  // 6b) annotate & reorder from TechnologyInfo.csv (adds friendly names & colors)
  const series = await annotateSeriesFromCsv(combined);

  // 7) merge & write
  const tpl = await loadTemplate("stackedBar");
  const config = merge({}, tpl, {
    title: { text: "Total Annual Capacity per Technology" },
    xAxis: { categories: years },
    series,
  });

  const outFile = path.join(OUT_DIR, "total-annual-capacity.config.json");
  await fs.writeFile(outFile, JSON.stringify(config, null, 2));
  console.log("Wrote:", outFile);
}
