import {
  parseCsv,
  loadTemplate,
  annotateTechSeries,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";
import { getFleetStockPerTechCode } from "../utils/transportCapacity.js";

const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Transport");

const TYPES = [
  "Passenger road - vehicles",
  "Passenger road - bus",
  "Freight road - light trucks",
  "Freight road - heavy trucks",
];

export async function buildTransportCapacityChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // returns: { stock: { [techCode]: { [year]: value } }, techListRows: [...] }
  const { stock: fleetData, techListRows } = await getFleetStockPerTechCode({
    includeRaw: true,
  });

  const transportTechs = techListRows
    .filter((r) => TYPES.includes(r.Type))
    .map((r) => r["Technology code"]);

  const techToType = {};
  techListRows.forEach((r) => {
    if (TYPES.includes(r.Type)) {
      techToType[r["Technology code"]] = r.Type;
    }
  });

  const agg = {};
  transportTechs.forEach((tech) => {
    const yearly = fleetData[tech];
    if (!yearly) return;

    Object.entries(yearly).forEach(([year, value]) => {
      agg[tech] ??= {};
      agg[tech][year] = value;
    });
  });

  const years = Array.from(
    new Set(
      Object.values(agg)
        .flatMap((o) => Object.keys(o))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  const series = transportTechs.map((code) => ({
    name: code,
    type: "column",
    data: years.map((y) => agg[code]?.[y] || 0),
  }));

  const seriesAnnotated = await annotateTechSeries(series);

  const tpl = await loadTemplate("stackedBar");
  const config = merge({}, tpl, {
    title: { text: "Vehicle Fleet Stock by Technology – Road Transport" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Vehicle Count" } },
    series: seriesAnnotated,
  });

  const outFile = path.join(OUT_DIR, "transport-capacity-annual.config.json");
  await fs.writeFile(outFile, JSON.stringify(config, null, 2));
  console.log("Wrote", outFile);
}
