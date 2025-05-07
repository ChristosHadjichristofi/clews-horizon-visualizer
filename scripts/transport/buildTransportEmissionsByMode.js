import { parseCsv, loadTemplate, splitTechnology } from "../utils/general.js";
import path from "path";
import fs from "fs/promises";
import merge from "lodash.merge";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Transport");

// Map each Type in EnergyModule_Tech_List.csv to one of the 7 modes:
const MODE_MAP = {
  "Passenger road - vehicles": "Passenger cars",
  "Passenger road - bus": "Buses",
  "Passenger rail": "Trains",
  Aviation: "Aviation",
  "Freight road - light trucks": "Light commercial vehicles",
  "Freight road - heavy trucks": "Heavy trucks",
  "Freight rail": "Trains",
  "Shipping/Maritime": "Shipping",
};

// GWP factors
const GWP = {
  EUCO2: 1,
  EUCH4: 28,
  EUCH4_ETS: 28,
  EUN2O: 265,
  EUN2O_ETS: 265,
};

async function loadCsvs() {
  const [prodRows, techListRows, inputActRows, emActRows] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")),
    parseCsv(path.join(CSV_DIR, "exported/InputActivityRatio.csv")),
    parseCsv(path.join(CSV_DIR, "exported/EmissionActivityRatio.csv")),
  ]);
  return { prodRows, techListRows, inputActRows, emActRows };
}

// 1) pivot InputActivityRatio into { [TECH]: { [year]: PJ_per_km } }
function pivotInput(rows) {
  const m = {};
  rows.forEach((r) => {
    m[r.TECHNOLOGY] ??= {};
    Object.entries(r).forEach(([k, v]) => {
      if (/^\d{4}$/.test(k)) m[r.TECHNOLOGY][k] = Number(v);
    });
  });
  return m;
}

// 2) pivot EmissionActivityRatio into { suffix: { [year]: MtCO2eq_per_PJ } }
//    applying GWP for CH4/N2O
function pivotEmissions(rows) {
  const m = {};
  rows.forEach((r) => {
    const factor = GWP[r.EMISSION];
    if (!factor) return;
    const suffix = splitTechnology(r.TECHNOLOGY).tech;
    m[suffix] ??= {};
    Object.entries(r).forEach(([k, v]) => {
      if (/^\d{4}$/.test(k)) {
        m[suffix][k] = (m[suffix][k] || 0) + Number(v) * factor;
      }
    });
  });
  return m;
}

export async function buildTransportEmissionsByModeChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const { prodRows, techListRows, inputActRows, emActRows } = await loadCsvs();

  // map tech→mode
  const techToMode = {};
  techListRows
    .filter((r) => r["Sub-module"] === "Transport")
    .forEach((r) => {
      const mode = MODE_MAP[r.Type];
      if (mode) techToMode[r["Technology code"]] = mode;
    });

  const inputMap = pivotInput(inputActRows);

  // filter only the EUEPS… and EUEGG…PPCS rows, then pivot
  const emRows = emActRows.filter((r) =>
    r.TECHNOLOGY.startsWith(`EUEPS${splitTechnology(r.TECHNOLOGY).tech}`)
  );
  const emisMap = pivotEmissions(emRows);

  // accumulate MtCO2-eq by mode & year
  const emissions = {
    "Passenger cars": {},
    Buses: {},
    Trains: {},
    Aviation: {},
    "Light commercial vehicles": {},
    "Heavy trucks": {},
    Shipping: {},
  };

  prodRows
    .filter((r) => r.FUEL.endsWith("KM") && techToMode[r.TECHNOLOGY])
    .forEach((r) => {
      const tech = r.TECHNOLOGY;
      const suffix = splitTechnology(tech).tech;
      const year = r.YEAR;
      const km = +r.VALUE;
      const mode = techToMode[tech];

      const pj = km * (inputMap[tech]?.[year] || 0);
      const mt = pj * (emisMap[suffix]?.[year] || 0);

      emissions[mode][year] = (emissions[mode][year] || 0) + mt;
    });

  // build years axis
  const years = Array.from(
    new Set(
      Object.values(emissions)
        .flatMap((m) => Object.keys(m))
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // build Highcharts series
  const series = Object.keys(emissions).map((mode) => ({
    name: mode,
    type: "column",
    data: years.map((y) => emissions[mode][y] || 0),
  }));

  const tpl = await loadTemplate("stackedBar");
  const cfg = merge({}, tpl, {
    title: { text: "Annual GHG Emissions by Mode – Transport" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Emissions (MtCO₂-eq)" } },
    series,
  });

  await fs.writeFile(
    path.join(OUT_DIR, "transport-emissions-by-mode.config.json"),
    JSON.stringify(cfg, null, 2)
  );
  console.log("Wrote transport-emissions-by-mode.config.json");
}
