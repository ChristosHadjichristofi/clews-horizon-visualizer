// src/components/common/Chart.tsx

import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import * as ExportingNS from "highcharts/modules/exporting";
import * as ExportDataNS from "highcharts/modules/export-data";
import * as OfflineExportingNS from "highcharts/modules/offline-exporting";

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
  // console.group(`[Chart] ${options.chart?.type || "?"} render`);
  // console.log("incoming yearRange:", yearRange);
  // console.log("incoming options.xAxis:", options.xAxis);

  // 1) deep‐clone
  const cfg = JSON.parse(JSON.stringify(options)) as Highcharts.Options;

  // 2) normalize xAxis0 whether array or object
  const rawXAxis = cfg.xAxis;
  let axis0: Record<string, any> = {};
  if (Array.isArray(rawXAxis)) {
    axis0 = rawXAxis[0] || {};
  } else if (rawXAxis && typeof rawXAxis === "object") {
    axis0 = rawXAxis;
  }

  // 3) grab raw categories
  const rawCats: Array<string | number> = Array.isArray(axis0.categories)
    ? axis0.categories
    : [];
  // console.log("rawCats:", rawCats);

  // 4) normalize to numbers
  const numericCats = rawCats.map((c) =>
    typeof c === "string" && /^\d+$/.test(c)
      ? parseInt(c, 10)
      : typeof c === "number"
      ? c
      : NaN
  );
  // console.log("numericCats:", numericCats);

  // 5) slice logic
  if (
    yearRange &&
    numericCats.length > 0 &&
    numericCats.every((n) => !isNaN(n))
  ) {
    const [minY, maxY] = yearRange;
    let startIdx = numericCats.findIndex((y) => y >= minY);
    let endIdx = numericCats.findIndex((y) => y > maxY);

    // clamp
    if (startIdx < 0) startIdx = 0;
    if (endIdx < 0) endIdx = numericCats.length;
    const sliceEnd = Math.min(endIdx, numericCats.length);
    // console.log("slice window indices:", startIdx, sliceEnd);

    if (sliceEnd > startIdx) {
      const newCats = rawCats.slice(startIdx, sliceEnd);
      // console.log("newCats:", newCats);

      // write back into cfg.xAxis
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

      // slice each series
      if (Array.isArray(cfg.series)) {
        cfg.series = (cfg.series as any[]).map((s) => {
          const dataArr = Array.isArray(s.data) ? s.data : [];
          // console.log(` original data length: ${dataArr.length}`);
          const sliced = dataArr.slice(startIdx, sliceEnd);
          // console.log(` new data length: ${sliced.length}`);
          return { ...s, data: sliced };
        });
      }
    } else {
      // console.log("empty slice window, skipping");
    }
  } else {
    // console.log("no valid categories or yearRange, skipping slice");
  }

  console.groupEnd();

  // 6) merge back exporting + scrollablePlotArea
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
