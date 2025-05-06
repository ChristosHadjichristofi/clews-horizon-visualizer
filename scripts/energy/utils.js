import fs from "fs/promises";
import Papa from "papaparse";
import path from "path";

export function splitTechnology(code) {
  return {
    full: code,
    region: code.slice(0, 2),
    module: code.slice(2, 3),
    sector: code.slice(3, 5),
    tech: code.slice(5, 8),
    dest: code.slice(8, 10),
    type: code.slice(10, 12),
  };
}

export function splitFuel(code = "") {
  return {
    full: code,
    region: code.slice(0, 2),
    module: code.slice(2, 3),
    fuelType: code.slice(3),
  };
}

export async function parseCsv(filePath) {
  const txt = await fs.readFile(filePath, "utf-8");
  const { data, errors } = Papa.parse(txt, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (errors.length) throw errors[0];
  return data;
}

export async function loadTemplate(name) {
  const raw = await fs.readFile(
    path.resolve(process.cwd(), "data", "templates", `${name}.template.json`),
    "utf-8"
  );
  return JSON.parse(raw);
}

// … existing imports & splitTechnology, parseCsv, loadTemplate …

/**
 * pivotLong: for single-dim pivots (e.g. Demand, TotalCapacityAnnual)
 *   rows       – array of { [yearKey], TECHNOLOGY, VALUE }
 *   keyField   – string name of the year column
 *   valueField – string name of the value column (defaults to 'VALUE')
 */
export function pivotLong(rows, keyField, valueField = "VALUE") {
  const years = Array.from(new Set(rows.map((r) => r[keyField]))).sort(
    (a, b) => a - b
  );
  const map = {};
  rows.forEach((r) => {
    map[r.TECHNOLOGY] = map[r.TECHNOLOGY] || {};
    map[r.TECHNOLOGY][r[keyField]] =
      (map[r.TECHNOLOGY][r[keyField]] || 0) + (r[valueField] || 0);
  });
  const series = Object.entries(map).map(([name, data]) => ({
    name,
    data: years.map((y) => data[y] || 0),
  }));
  return { years, series };
}
