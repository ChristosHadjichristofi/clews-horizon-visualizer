import { parseCsv } from "../utils/general.js";
import path from "path";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");

const DEFAULT_TYPES = [
  "Passenger road - vehicles",
  "Passenger road - bus",
  "Freight road - light trucks",
  "Freight road - heavy trucks",
];

const EXTENDED_TYPES = [
  "Passenger rail",
  "Aviation",
  "Freight rail",
  "Shipping/Maritime",
];

function cleanActivityValue(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.replace(/,/g, ""));
  if (value == null) return null;
  try {
    return parseFloat(String(value).replace(/,/g, ""));
  } catch {
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

export async function getFleetStockPerTechCode({
  includeRaw = false,
  extended = false,
} = {}) {
  const [capacityRows, techListRows, unitRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "TotalCapacityAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/TransportUnits.csv")),
  ]);

  const allowedTypes = extended
    ? [...DEFAULT_TYPES, ...EXTENDED_TYPES]
    : DEFAULT_TYPES;

  const transportTechs = techListRows
    .filter((r) => allowedTypes.includes(r.Type))
    .map((r) => r["Technology code"]);

  const activityMap = {};
  unitRows.forEach((row) => {
    const techCode = row["Technology code"];
    const rawActivity = row["Annual Activity per unit"];
    const unit = row["Unit"];
    const activity = cleanActivityValue(rawActivity);
    const scale = getUnitScalingFactor(unit);
    if (techCode && !isNaN(activity) && scale != null) {
      activityMap[techCode] = activity * scale;
    }
  });

  const stock = {};
  capacityRows
    .filter((r) => transportTechs.includes(r.TECHNOLOGY))
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const year = r.YEAR;
      const val = +r.VALUE;
      const activity = activityMap[tech];
      const converted = activity ? (val / activity) * 1e9 : val;
      stock[tech] ??= {};
      stock[tech][year] = (stock[tech][year] || 0) + converted;
    });

  if (includeRaw) {
    return { stock, techListRows };
  } else {
    return stock;
  }
}
