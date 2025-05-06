import fs from "fs/promises";
import path from "path";
import merge from "lodash.merge";
import { splitTechnology, parseCsv, loadTemplate } from "./utils.js";

const CSV_DIR = path.resolve(process.cwd(), "data/csv");
const EXP_DIR = path.resolve(CSV_DIR, "exported");
const OUT_DIR = path.resolve(process.cwd(), "data/chartConfigs", "Energy");

async function loadCsvs() {
  const [
    capInvRows,
    salvageRows,
    fomRows,
    prodRows,
    varOpexRows,
    inputActRows,
    varCostRows,
    emActRows,
    emisPenRows,
  ] = await Promise.all([
    parseCsv(path.join(CSV_DIR, "CapitalInvestment.csv")),
    parseCsv(path.join(CSV_DIR, "SalvageValue.csv")),
    parseCsv(path.join(CSV_DIR, "AnnualFixedOperatingCost.csv")),
    parseCsv(path.join(CSV_DIR, "ProductionByTechnologyAnnual.csv")),
    parseCsv(path.join(CSV_DIR, "AnnualVariableOperatingCost.csv")),
    parseCsv(path.join(EXP_DIR, "InputActivityRatio.csv")),
    parseCsv(path.join(EXP_DIR, "VariableCost.csv")),
    parseCsv(path.join(EXP_DIR, "EmissionActivityRatio.csv")),
    parseCsv(path.join(EXP_DIR, "EmissionsPenalty.csv")),
  ]);
  return {
    capInvRows,
    salvageRows,
    fomRows,
    prodRows,
    varOpexRows,
    inputActRows,
    varCostRows,
    emActRows,
    emisPenRows,
  };
}

const isEUeg = (r) => {
  const t = splitTechnology(r.TECHNOLOGY);
  return t.region === "EU" && t.module === "E" && t.sector === "EG";
};

function sumValues(map) {
  return Object.values(map).reduce((sum, v) => sum + v, 0);
}

function aggregateSimple(
  rows,
  keyYear,
  keyValue,
  filterFn,
  invertSign = false
) {
  const out = {};
  rows.filter(filterFn).forEach((r) => {
    const v = Number(r[keyValue]) * (invertSign ? -1 : 1);
    out[r[keyYear]] = (out[r[keyYear]] || 0) + v;
  });
  return out;
}

function pivotWideBySuffix(rows, codePrefix, splitFn) {
  const map = {};
  rows
    .filter((r) => !codePrefix || r.TECHNOLOGY.startsWith(codePrefix))
    .forEach((r) => {
      const suffix = splitFn(r.TECHNOLOGY).tech;
      map[suffix] ??= {};
      Object.entries(r).forEach(([col, val]) => {
        if (/^[0-9]{4}$/.test(col)) map[suffix][col] = Number(val);
      });
    });
  return map;
}

function pivotLongByTechnology(rows) {
  const map = {};
  rows.filter(isEUeg).forEach((r) => {
    const tech = r.TECHNOLOGY;
    const year = r.YEAR;
    const val = +r.VALUE;
    map[tech] ??= {};
    map[tech][year] = (map[tech][year] || 0) + val;
  });
  return map;
}

function computeFuelCost(prodRows, inputMap, varCostMap) {
  const fuelCost = {};
  prodRows.filter(isEUeg).forEach((r) => {
    const year = r.YEAR;
    const prodPJ = +r.VALUE;
    const suffix = splitTechnology(r.TECHNOLOGY).tech;
    const ir = inputMap[suffix]?.[year] || 0;
    const vc = varCostMap[suffix]?.[year] || 0;
    const cost = prodPJ * ir * vc;
    fuelCost[year] = (fuelCost[year] || 0) + cost;
  });
  return fuelCost;
}

function computeEmissionCost(prodRows, inputMap, emActMap, penRate) {
  const emisCost = {};
  prodRows.filter(isEUeg).forEach((r) => {
    const year = r.YEAR;
    const prodPJ = +r.VALUE;
    const suffix = splitTechnology(r.TECHNOLOGY).tech;
    const inputRatio = inputMap[suffix]?.[year] || 0;
    const emitRatio = emActMap[suffix]?.[year] || 0;
    const penaltyRate = penRate[year] || 0;
    const cost = prodPJ * inputRatio * emitRatio * penaltyRate;
    emisCost[year] = (emisCost[year] || 0) + cost;
  });
  return emisCost;
}

function computeFuelCostByTech(prodRows, inputMap, varCostMap) {
  const map = {};
  prodRows.filter(isEUeg).forEach((r) => {
    const tech = r.TECHNOLOGY;
    const year = r.YEAR;
    const prodPJ = +r.VALUE;
    const suffix = splitTechnology(tech).tech;
    const ir = inputMap[suffix]?.[year] || 0;
    const vc = varCostMap[suffix]?.[year] || 0;
    const cost = prodPJ * ir * vc;
    map[tech] ??= {};
    map[tech][year] = (map[tech][year] || 0) + cost;
  });
  return map;
}

export async function buildSystemCostChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const {
    capInvRows,
    salvageRows,
    fomRows,
    prodRows,
    varOpexRows,
    inputActRows,
    varCostRows,
    emActRows,
    emisPenRows,
  } = await loadCsvs();

  const capInv = aggregateSimple(capInvRows, "YEAR", "VALUE", isEUeg);
  const salvage = aggregateSimple(salvageRows, "YEAR", "VALUE", isEUeg, true);
  const fom = aggregateSimple(fomRows, "YEAR", "VALUE", isEUeg);
  const vomex = aggregateSimple(varOpexRows, "YEAR", "VALUE", isEUeg);

  const inputMap = pivotWideBySuffix(inputActRows, "EUEEG", splitTechnology);
  const varCostMap = pivotWideBySuffix(varCostRows, "EUEPS", splitTechnology);

  const emActMap = pivotWideBySuffix(
    emActRows.filter((r) => r.EMISSION === "EUCO2_ETS"),
    "EUEPS",
    splitTechnology
  );

  const penRate = {};
  emisPenRows
    .filter((r) => r.REGION === "EU27" && r.EMISSION === "EUCO2_ETS")
    .forEach((r) => {
      Object.entries(r).forEach(([col, val]) => {
        if (/^[0-9]{4}$/.test(col)) penRate[col] = +val;
      });
    });

  const fuelCost = computeFuelCost(prodRows, inputMap, varCostMap);
  const emisCost = computeEmissionCost(prodRows, inputMap, emActMap, penRate);

  const years = Array.from(
    new Set(
      [
        ...Object.keys(capInv),
        ...Object.keys(salvage),
        ...Object.keys(fom),
        ...Object.keys(vomex),
        ...Object.keys(fuelCost),
        ...Object.keys(emisCost),
      ].map(Number)
    )
  ).sort((a, b) => a - b);

  const series = [
    {
      name: "Capital Investment",
      type: "column",
      data: years.map((y) => capInv[y] || 0),
    },
    {
      name: "Salvage Value",
      type: "column",
      data: years.map((y) => salvage[y] || 0),
    },
    {
      name: "Fixed Opex (FOM)",
      type: "column",
      data: years.map((y) => fom[y] || 0),
    },
    {
      name: "Fuel Cost",
      type: "column",
      data: years.map((y) => fuelCost[y] || 0),
    },
    {
      name: "Variable Opex (VOM)",
      type: "column",
      data: years.map((y) => vomex[y] || 0),
    },
    {
      name: "Emission Penalty",
      type: "column",
      data: years.map((y) => emisCost[y] || 0),
    },
  ];

  const tpl = await loadTemplate("stackedBar");
  const config = merge({}, tpl, {
    title: { text: "Total System Cost Breakdown by Year" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Cost (million USD)" } },
    series,
  });

  const outFile = path.join(OUT_DIR, "system-cost-annual.config.json");
  await fs.writeFile(outFile, JSON.stringify(config, null, 2));
  console.log("Wrote", outFile);
}

export async function buildSystemCostByTechChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const {
    capInvRows,
    salvageRows,
    fomRows,
    prodRows,
    varOpexRows,
    inputActRows,
    varCostRows,
  } = await loadCsvs();

  // pivot each cost type by full technology name
  const capInvMap = pivotLongByTechnology(capInvRows.filter(isEUeg));
  const salvageMap = pivotLongByTechnology(salvageRows.filter(isEUeg));
  const fomMap = pivotLongByTechnology(fomRows.filter(isEUeg));
  const vomexMap = pivotLongByTechnology(varOpexRows.filter(isEUeg));

  // pivot inputs and variable costs by suffix for fuel calculation
  const inputMap = pivotWideBySuffix(inputActRows, "EUEEG", splitTechnology);
  const varCostMap = pivotWideBySuffix(varCostRows, "EUEPS", splitTechnology);

  // compute fuel cost per full technology name
  const fuelCostMap = computeFuelCostByTech(prodRows, inputMap, varCostMap);

  // invert salvage values
  Object.values(salvageMap).forEach((yearMap) => {
    Object.keys(yearMap).forEach((year) => {
      yearMap[year] = -yearMap[year];
    });
  });

  // gather all technology names and years
  const techs = Array.from(
    new Set([
      ...Object.keys(capInvMap),
      ...Object.keys(salvageMap),
      ...Object.keys(fomMap),
      ...Object.keys(vomexMap),
      ...Object.keys(fuelCostMap),
    ])
  ).sort();

  const years = Array.from(
    new Set(
      techs
        .flatMap((tech) => [
          ...Object.keys(capInvMap[tech] || {}),
          ...Object.keys(salvageMap[tech] || {}),
          ...Object.keys(fomMap[tech] || {}),
          ...Object.keys(vomexMap[tech] || {}),
          ...Object.keys(fuelCostMap[tech] || {}),
        ])
        .map(Number)
    )
  ).sort((a, b) => a - b);

  // assemble series: one per technology and cost type
  const series = [];
  techs.forEach((tech) => {
    series.push({
      name: `${tech} - Capital Investment`,
      type: "column",
      data: years.map((y) => capInvMap[tech]?.[y] || 0),
    });
    series.push({
      name: `${tech} - Salvage Value`,
      type: "column",
      data: years.map((y) => salvageMap[tech]?.[y] || 0),
    });
    series.push({
      name: `${tech} - Fixed Opex (FOM)`,
      type: "column",
      data: years.map((y) => fomMap[tech]?.[y] || 0),
    });
    series.push({
      name: `${tech} - Fuel Cost`,
      type: "column",
      data: years.map((y) => fuelCostMap[tech]?.[y] || 0),
    });
    series.push({
      name: `${tech} - Variable Opex (VOM)`,
      type: "column",
      data: years.map((y) => vomexMap[tech]?.[y] || 0),
    });
  });

  // build chart config
  const tpl = await loadTemplate("stackedBar");
  const config = merge({}, tpl, {
    title: { text: "System Cost Breakdown by Technology and Year" },
    xAxis: { categories: years, title: { text: "Year" } },
    yAxis: { title: { text: "Cost (million USD)" } },
    series,
  });

  // write out
  const outFile = path.join(OUT_DIR, "system-cost-by-tech.config.json");
  await fs.writeFile(outFile, JSON.stringify(config, null, 2));
  console.log("Wrote", outFile);
}

export async function buildSystemCostHorizonChart() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // 1) Load & aggregate exactly as before
  const {
    capInvRows,
    salvageRows,
    fomRows,
    prodRows,
    varOpexRows,
    inputActRows,
    varCostRows,
    emActRows,
    emisPenRows,
  } = await loadCsvs();

  const capInv = aggregateSimple(capInvRows, "YEAR", "VALUE", isEUeg);
  const salvage = aggregateSimple(salvageRows, "YEAR", "VALUE", isEUeg, true);
  const fom = aggregateSimple(fomRows, "YEAR", "VALUE", isEUeg);
  const vomex = aggregateSimple(varOpexRows, "YEAR", "VALUE", isEUeg);

  const inputMap = pivotWideBySuffix(inputActRows, "EUEEG", splitTechnology);
  const varCostMap = pivotWideBySuffix(varCostRows, "EUEPS", splitTechnology);
  const emActMap = pivotWideBySuffix(
    emActRows.filter((r) => r.EMISSION === "EUCO2_ETS"),
    "EUEPS",
    splitTechnology
  );
  const penRate = {};
  emisPenRows
    .filter((r) => r.REGION === "EU27" && r.EMISSION === "EUCO2_ETS")
    .forEach((r) =>
      Object.entries(r).forEach(([c, v]) => {
        if (/^[0-9]{4}$/.test(c)) penRate[c] = +v;
      })
    );

  const fuelCost = computeFuelCost(prodRows, inputMap, varCostMap);
  const emisCost = computeEmissionCost(prodRows, inputMap, emActMap, penRate);

  // 2) Sum over all years to get horizon totals
  const totals = {
    "Capital Investment": sumValues(capInv),
    "Salvage Value": sumValues(salvage),
    "Fixed Opex (FOM)": sumValues(fom),
    "Fuel Cost": sumValues(fuelCost),
    "Variable Opex (VOM)": sumValues(vomex),
    "Emission Penalty": sumValues(emisCost),
  };

  // 3) Build a single‐category stacked‐column series
  const category = "Total Horizon";
  const series = Object.entries(totals).map(([name, value]) => ({
    name,
    type: "column",
    data: [value],
  }));

  // 4) Use the stackedBar template
  const tpl = await loadTemplate("stackedBar");
  const config = merge({}, tpl, {
    title: { text: "Total System Cost Over Horizon" },
    xAxis: { categories: [category], title: { text: "" } },
    yAxis: { title: { text: "Cost (million USD)" } },
    series,
  });

  await fs.writeFile(
    path.join(OUT_DIR, "system-cost-horizon.config.json"),
    JSON.stringify(config, null, 2)
  );
  console.log("Wrote system-cost-horizon.config.json");
}
