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

// Τεστ
const CSV_DIR = path.resolve(process.cwd(), "data/csv");

// 1) Friendly names for full Technology codes
async function loadTechFriendlyMap() {
  const rows = await parseCsv(
    path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")
  );
  return rows.reduce((m, r) => {
    m[r["Technology code"]] = r["Technology"];
    return m;
  }, {});
}

async function loadTechTypeMap() {
  const rows = await parseCsv(
    path.join(CSV_DIR, "exported/EnergyModule_Tech_List.csv")
  );
  return rows.reduce((m, r) => {
    m[r["Technology code"]] = r["Type"];
    return m;
  }, {});
}

// 2) Primary HEX colors for each suffix from OrderAndColor.csv
async function loadSuffixColorMap() {
  const rows = await parseCsv(path.join(CSV_DIR, "OrderAndColor.csv"));
  return rows.reduce((m, r) => {
    const suffix = splitTechnology(r.Code).tech;
    m[suffix] = r["Indicative HEX"];
    return m;
  }, {});
}

// 3) Hard‐coded overrides for the eight core suffixes
const SUFFIX_OVERRIDES = {
  BIO: { name: "Biomass", color: "#228B22" },
  COA: { name: "Coal", color: "#636363" },
  ELC: { name: "Electricity", color: "#FFD700" },
  HEA: { name: "Heat", color: "#FF4500" },
  LPG: { name: "LPG", color: "#1E90FF" },
  NGS: { name: "Natural Gas", color: "#00CED1" },
  OIL: { name: "Oil", color: "#8B4513" },
  STH: { name: "Solar Thermal", color: "#FF69B4" },
  HY2: { name: "Hydrogen", color: "#00FF00" },
  DSL: { name: "Diesel", color: "#A52A2A" },
  GSL: { name: "Gasoline", color: "#FF6347" },
  HFO: { name: "Heavy Fuel Oil", color: "#8B0000" },
  KRS: { name: "Kerosene", color: "#FF8C00" },
  LPG: { name: "Liquefied Petroleum Gas", color: "#4682B4" },
  URA: { name: "Uranium", color: "#B22222" },

  // Only for Industries
  UEC: { name: "Chemical & petrochemical", color: "#FF8C00" },
  UEF: { name: "Food, beverages & tobacco", color: "#FF6347" },
  UEI: { name: "Iron & steel", color: "#8B0000" },
  UEN: { name: "Non-metallic minerals", color: "#B22222" },
  UEO: { name: "Other industries", color: "#DAA520" },
  UEP: { name: "Paper, pulp & printing", color: "#4682B4" },
};

const COST_MAPPING_COLORS = {
  "Emission Penalty": "#d62728",
  "Variable Opex (VOM)": "#ff7f0e",
  "Fuel Cost": "#bcbd22",
  "Fixed Opex (FOM)": "#9467bd",
  "Salvage Value": "#2ca02c",
  "Capital Investment": "#8c564b",
};
// 4) Semantic colors for “000”‐suffix LO/ME/HI
const LEVEL_COLORS = {
  LO: { label: "Low", color: "#2ecc71" }, // green
  ME: { label: "Medium", color: "#f39c12" }, // orange
  HI: { label: "High", color: "#e74c3c" }, // red
};

// 5) A palette of pattern definitions to cycle through on duplicates
const PATTERN_DEFS = [
  { d: "M 0 0 L 6 6", strokeWidth: 2 }, // diagonal
  { d: "M 6 0 L 0 6", strokeWidth: 2 }, // reverse diagonal
  { d: "M 3 0 L 3 6", strokeWidth: 2 }, // vertical
  { d: "M 0 3 L 6 3", strokeWidth: 2 }, // horizontal
  { d: "M1 3 A1 1 0 1 0 1.1 3", strokeWidth: 0 }, // dots
  { d: "M 0 3 L 6 3 M 3 0 L 3 6", strokeWidth: 2 }, // cross-hatch
];

// helper: slight hue‐shift of a hex color by `degrees`
// (same as before)
function shiftHue(hex, degrees) {
  /* ...existing shiftHue implementation... */
  const c = hex.replace(/^#/, "");
  const num = parseInt(c, 16);
  let r = (num >> 16) & 0xff,
    g = (num >> 8) & 0xff,
    b = num & 0xff;
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  h = ((h * 360 + degrees) % 360) / 360;
  let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  let p = 2 * l - q;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  r = hue2rgb(p, q, h + 1 / 3);
  g = hue2rgb(p, q, h);
  b = hue2rgb(p, q, h - 1 / 3);
  const toHex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Annotate each series entry:
 *  - first, handle “000” suffix LO/ME/HI as semantic levels
 *  - otherwise replace its `name` (tech code) with a friendly name
 *  - pick a baseColor from overrides or OrderAndColor
 *  - the first time a baseColor appears → solid fill
 *    repeats → shift its hue + overlay a pattern
 */
export async function annotateTechSeries(rawSeries, typeColIncluded = false) {
  const techFriendly = await loadTechFriendlyMap();
  const techToType = await loadTechTypeMap();
  const suffixColors = await loadSuffixColorMap();
  const usageCount = {};

  // invert SUFFIX_OVERRIDES to map friendlyName → color
  const friendlyColor = Object.values(SUFFIX_OVERRIDES).reduce((m, o) => {
    m[o.name] = o.color;
    return m;
  }, {});

  return rawSeries.map((s) => {
    const code = s.name;

    // For any series that has already the name annotated, but not the color
    if (friendlyColor[code]) {
      return { ...s, color: friendlyColor[code] };
    }

    // For any series that uses name inside COST_MAPPING_COLORS, add the color
    if (COST_MAPPING_COLORS[code]) {
      return { ...s, color: COST_MAPPING_COLORS[code] };
    }

    const suffix = splitTechnology(code).tech;

    let friendlyName = null;

    if (typeColIncluded) {
      friendlyName = `${techFriendly[code]} : ${techToType[code]}`;
    } else {
      friendlyName = techFriendly[code];
    }

    friendlyName = friendlyName || code;

    // — semantic LO/ME/HI for tech="000" —
    if (suffix === "000") {
      const level = code.slice(-2).toUpperCase();
      const info = LEVEL_COLORS[level];
      if (info) {
        return {
          ...s,
          name: `${techFriendly[code] || code}`,
          color: info.color,
        };
      }
    }

    // — friendly name and baseColor —
    const overrideFull = SUFFIX_OVERRIDES[code];
    const friendly = overrideFull?.name || friendlyName || code;
    const baseColor = overrideFull?.color || suffixColors[suffix] || "#888888";

    // — count usages & decide fill vs. pattern —
    const count = (usageCount[baseColor] = (usageCount[baseColor] || 0) + 1);
    if (count === 1) {
      return { ...s, name: friendly, color: baseColor };
    }

    // — duplicates get big hue shift + pattern overlay —
    const shifted = shiftHue(baseColor, 90 * (count - 1));
    const def = PATTERN_DEFS[(count - 2) % PATTERN_DEFS.length];
    return {
      ...s,
      name: friendly,
      color: {
        pattern: {
          backgroundColor: shifted,
          path: {
            d: def.d,
            stroke: baseColor,
            strokeWidth: def.strokeWidth,
          },
          width: 6,
          height: 6,
          opacity: 0.5,
        },
      },
    };
  });
}
