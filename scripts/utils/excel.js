import fs from "fs/promises";
import path from "path";
import XLSX from "xlsx";

const cache = {};

/**
 * Read a specific sheet from an XLSX file and return its rows as JSON.
 * Caches per (filePath, sheetName).
 *
 * @param {string} fileName  Relative to project root, e.g. "data/raw/MyWorkbook.xlsx"
 * @param {string} sheetName Exact sheet name, e.g. "InputActivityRatio"
 * @returns {Promise<object[]>} Array of row-objects { COL1: val1, COL2: val2, … }
 */
export async function readSheetAsJson(fileName, sheetName) {
  const key = `${fileName}::${sheetName}`;
  if (cache[key]) return cache[key];

  const absPath = path.resolve(process.cwd(), fileName);
  const buffer = await fs.readFile(absPath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${fileName}`);
  }

  const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
  cache[key] = json;
  return json;
}

/**
 * Export a given sheet from an XLSX file out to CSV.
 *
 * @param {string} fileName  Relative to project root
 * @param {string} sheetName
 * @param {string} outCsvPath Where to write the CSV, e.g. "data/csv/InputActivityRatio.csv"
 */
export async function exportSheetToCsv(fileName, sheetName, outCsvPath) {
  const absPath = path.resolve(process.cwd(), fileName);
  const buffer = await fs.readFile(absPath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${fileName}`);
  }

  const csv = XLSX.utils.sheet_to_csv(sheet);
  const absOut = path.resolve(process.cwd(), outCsvPath);
  await fs.mkdir(path.dirname(absOut), { recursive: true });
  await fs.writeFile(absOut, csv, "utf8");
}
