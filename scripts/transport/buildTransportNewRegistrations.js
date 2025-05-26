import {
  parseCsv,
  loadTemplate,
  annotateTechSeries,
} from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Transport");

const TYPES = [
  "Passenger road - vehicles",
  "Passenger road - bus",
  "Freight road - light trucks",
  "Freight road - heavy trucks",
];

function cleanActivityValue(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.replace(/,/g, ""));
  if (value == null) return null;

  try {
    const str = String(value);
    return parseFloat(str.replace(/,/g, ""));
  } catch (err) {
    console.warn("Invalid activity value type:", value);
    return null;
  }
}

function getUnitScalingFactor(unit) {
  switch (unit) {
    case "Gvehkm":
    case "Gtkm":
    case "Gpkm":
      return 1;
    case "Mvkm":
      return 1e-3;
    default:
      return null;
  }
}

async function loadCsvs() {
  const [newRows, techListRows, unitRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "NewCapacity.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/TransportUnits.csv")),
  ]);
  return { newRows, techListRows, unitRows };
}

export async function buildTransportNewRegistrationsChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const { newRows, techListRows, unitRows } = await loadCsvs();

  const transportTechs = techListRows
    .filter((r) => TYPES.includes(r.Type))
    .map((r) => r["Technology code"]);

  // Build map: techCode → scaled activity per unit
  const activityMap = {};
  unitRows.forEach((row, idx) => {
    const techCode = row["Technology code"];
    const rawActivity = row["Annual Activity per unit"];
    const unit = row["Unit"];

    const activity = cleanActivityValue(rawActivity);
    const scale = getUnitScalingFactor(unit);

    if (techCode && !isNaN(activity) && scale != null) {
      activityMap[techCode] = activity * scale;
    } else {
      console.warn(
        `Skipping row ${idx} – techCode: ${techCode}, activity: ${rawActivity}, unit: ${unit}`
      );
    }
  });

  // Aggregate new registrations (converted from vkm to unit count)
  const agg = {};
  newRows
    .filter((r) => transportTechs.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const year = r.YEAR;
      const val = +r.VALUE;

      const activity = activityMap[tech];
      const converted = activity ? (val / activity) * 1e9 : val;
      agg[tech] ??= {};
      agg[tech][year] = (agg[tech][year] || 0) + converted;
    });

  const years = Array.from(
    new Set(Object.values(agg).flatMap(Object.keys).map(Number))
  ).sort((a, b) => a - b);

  const series = transportTechs.map((code) => ({
    name: code,
    type: "column",
    data: years.map((y) => agg[code]?.[y] || 0),
  }));

  const annotatedSeries = await annotateTechSeries(series);

  const tpl = await loadTemplate("stackedBar");
  const config = merge({}, tpl, {
    title: { text: "New Vehicle Registrations by Technology – Road Transport" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Registrations (units)" } },
    series: annotatedSeries,
  });

  const outFile = path.join(OUT_DIR, "transport-new-registrations.config.json");
  await fs.writeFile(outFile, JSON.stringify(config, null, 2));
  console.log("Wrote", outFile);
}
