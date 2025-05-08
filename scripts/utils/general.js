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

/**
 * rawSeries: Array of Highcharts series objects, where
 *   s.name is either
 *     - exactly the technology code (e.g. "EUEEGURAPP00")
 *     - or technology code + " (Existing)" or " (New)"
 *
 * OrderAndColor.csv columns:
 *   Order,Name,Code,Indicative HEX,Secondary HEX
 */
export async function annotateSeriesFromCsv(rawSeries) {
  // 1) load & sort CSV
  const csvFile = path.resolve(process.cwd(), "data/csv/OrderAndColor.csv");
  const infoRows = await parseCsv(csvFile);
  infoRows.sort((a, b) => Number(a.Order) - Number(b.Order));

  // 2) build lookup Code → { friendly, primary, secondary }
  const infoMap = {};
  for (const r of infoRows) {
    infoMap[r.Code] = {
      friendly: r.Name,
      primary: r["Indicative HEX"],
      secondary: r["Secondary HEX"] || null,
    };
  }

  const used = new Set();
  const out = [];

  // 3) in CSV order, match & annotate
  for (const { Code } of infoRows) {
    const { friendly, primary, secondary } = infoMap[Code];

    rawSeries
      .filter(
        (s) => s.name === Code || s.name.startsWith(Code + " (") // catches “ (Existing)” or “ (New)”
      )
      .forEach((s) => {
        const isNew = /\s\(New\)$/.test(s.name);
        const suffix = isNew ? " (New)" : " (Existing)";

        // solid or gradient fill for Existing
        const baseColor = secondary
          ? {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, primary],
                [1, secondary],
              ],
            }
          : primary;

        // build the final "color" property:
        // - Existing: just color
        // - New: a pattern object
        const colorProp = isNew
          ? {
              // pattern-fill API:
              color: {
                pattern: {
                  // diagonal stripe path
                  path: {
                    d: "M 0 0 L 6 6",
                    stroke: secondary || primary,
                    strokeWidth: 2,
                  },
                  width: 6,
                  height: 6,
                  // behind the stripe, fill with the primary
                  backgroundColor: primary,
                  opacity: 0.5,
                },
              },
            }
          : { color: baseColor };

        out.push({
          ...s,
          name: friendly + suffix,
          ...colorProp,
        });

        used.add(s);
      });
  }

  // 4) now catch any “ByTech” cost series like "EUEEGURAPP00 - Capital Investment", etc.
  const costLabels = [
    "Capital Investment",
    "Salvage Value",
    "Fixed Opex (FOM)",
    "Variable Opex (VOM)",
    "Fuel Cost",
  ];
  const costPatterns = {
    "Capital Investment": "M 0 3 L 6 3", // horizontal stripe
    "Salvage Value": "M 3 0 L 3 6", // vertical stripe
    "Fixed Opex (FOM)": "M 0 0 L 6 6", // 45°
    "Variable Opex (VOM)": "M 6 0 L 0 6", // 135°
    "Fuel Cost": "M 0 6 L 6 0", //  -45°
  };

  for (const s of rawSeries) {
    if (used.has(s)) continue;
    // split out <tech> and <label>
    const m = s.name.match(/^(.+?) - (.+)$/);
    if (!m) continue;
    const [, code, label] = m;
    if (!costLabels.includes(label)) continue;

    // lookup primary color from your tech CSV (fallback to grey)
    const info = infoMap[code] || {
      primary: "#888",
      secondary: null,
      friendly: code,
    };
    const primary = info.primary;

    // build a stripe pattern
    const pattern = {
      pattern: {
        path: {
          d: costPatterns[label],
          stroke: primary,
          strokeWidth: 2,
        },
        width: 6,
        height: 6,
        backgroundColor: primary,
        opacity: 0.4,
      },
    };

    out.push({
      ...s,
      // replace code with friendly name, keep " - Label"
      name: info.friendly + " - " + label,
      color: pattern,
    });
    used.add(s);
  }

  // 4) append any unmatched series last
  for (const s of rawSeries) {
    if (!used.has(s)) {
      out.push(s);
    }
  }

  return out.reverse();
}
