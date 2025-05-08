import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

// Highcharts modules
import * as ExportingNS from "highcharts/modules/exporting";
import * as ExportDataNS from "highcharts/modules/export-data";
import * as OfflineExportingNS from "highcharts/modules/offline-exporting";
// ➤ pattern-fill module for diagonal stripes
import * as PatternFillNS from "highcharts/modules/pattern-fill";

// init Highcharts modules
function initHCModule(mod: any) {
  const fn =
    typeof mod === "function"
      ? mod
      : mod.default && typeof mod.default === "function"
      ? mod.default
      : null;
  if (fn) fn(Highcharts);
}

initHCModule(ExportingNS);
initHCModule(ExportDataNS);
initHCModule(OfflineExportingNS);
// ➤ register pattern-fill **after** other modules
initHCModule(PatternFillNS);

export interface ChartProps {
  options: Highcharts.Options;
  yearRange?: [number, number];
  containerStyle?: React.CSSProperties;
}

export default function Chart({
  options,
  yearRange,
  containerStyle,
}: ChartProps) {
  // 1) deep‐clone so we don’t mutate props
  const cfg = JSON.parse(JSON.stringify(options)) as Highcharts.Options;

  // 2) normalize xAxis[0]
  let axis0: any = {};
  if (Array.isArray(cfg.xAxis)) {
    axis0 = cfg.xAxis[0] || {};
  } else if (cfg.xAxis && typeof cfg.xAxis === "object") {
    axis0 = cfg.xAxis;
  }

  // 3) extract categories
  const rawCats: Array<string | number> = Array.isArray(axis0.categories)
    ? axis0.categories
    : [];

  // 4) convert to numbers
  const numericCats = rawCats.map((c) =>
    typeof c === "string" && /^\d+$/.test(c)
      ? parseInt(c, 10)
      : typeof c === "number"
      ? c
      : NaN
  );

  // 5) apply yearRange slicing if requested
  if (
    yearRange &&
    numericCats.length > 0 &&
    numericCats.every((n) => !isNaN(n))
  ) {
    let [minY, maxY] = yearRange;
    let startIdx = numericCats.findIndex((y) => y >= minY);
    let endIdx = numericCats.findIndex((y) => y > maxY);

    if (startIdx < 0) startIdx = 0;
    if (endIdx < 0) endIdx = numericCats.length;
    const sliceEnd = Math.min(endIdx, numericCats.length);

    if (sliceEnd > startIdx) {
      const newCats = rawCats.slice(startIdx, sliceEnd);

      // write back
      if (Array.isArray(cfg.xAxis)) {
        (cfg.xAxis[0] as any).categories = newCats;
        (cfg.xAxis[0] as any).tickInterval = 1;
      } else {
        cfg.xAxis = {
          ...(cfg.xAxis as any),
          categories: newCats,
          tickInterval: 1,
        };
      }

      // slice series data
      if (Array.isArray(cfg.series)) {
        cfg.series = (cfg.series as any[]).map((s) => {
          const dataArr = Array.isArray(s.data) ? s.data : [];
          const sliced = dataArr.slice(startIdx, sliceEnd);
          return { ...s, data: sliced };
        });
      }
    }
  }

  // 6) merge in exporting + scrollablePlotArea
  const mergedOptions: Highcharts.Options = {
    ...cfg,
    chart: {
      ...(cfg.chart || {}),
      height: undefined,
      scrollablePlotArea: {
        ...(cfg.chart?.scrollablePlotArea || {}),
        minWidth: 1200,
        scrollPositionX: 0,
      },
      events: { ...(cfg.chart?.events || {}) },
    },
    exporting: {
      ...(cfg.exporting || {}),
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: [
            "viewFullscreen",
            "printChart",
            "separator",
            "downloadPNG",
            "downloadJPEG",
            "downloadPDF",
            "downloadSVG",
            "separator",
            "downloadCSV",
            "downloadXLS",
          ],
        },
      },
    },
  };

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={mergedOptions}
      containerProps={{
        style: {
          width: "100%",
          height: containerStyle?.height ?? "400px",
          background: "#fff",
          ...containerStyle,
        },
      }}
    />
  );
}
