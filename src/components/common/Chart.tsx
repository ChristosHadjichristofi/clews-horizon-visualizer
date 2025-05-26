import React, { useRef, useImperativeHandle, forwardRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

import * as ExportingNS from "highcharts/modules/exporting";
import * as ExportDataNS from "highcharts/modules/export-data";
import * as OfflineExportingNS from "highcharts/modules/offline-exporting";
import * as PatternFillNS from "highcharts/modules/pattern-fill";
import * as DrilldownNS from "highcharts/modules/drilldown";

function initHCModule(mod: any) {
  const fn =
    typeof mod === "function"
      ? mod
      : mod.default && typeof mod.default === "function"
      ? mod.default
      : null;
  if (fn) fn(Highcharts);
}

[
  ExportingNS,
  ExportDataNS,
  OfflineExportingNS,
  PatternFillNS,
  DrilldownNS,
].forEach(initHCModule);

export interface ChartProps {
  options: Highcharts.Options;
  yearRange?: [number, number];
  containerStyle?: React.CSSProperties;
}

const Chart = forwardRef<Highcharts.Chart | undefined, ChartProps>(
  ({ options, yearRange, containerStyle }, ref) => {
    const chartRef = useRef<Highcharts.Chart>();

    useImperativeHandle(ref, () => chartRef.current, []);

    const cfg = JSON.parse(JSON.stringify(options)) as Highcharts.Options;

    let axis0: any = {};
    if (Array.isArray(cfg.xAxis)) axis0 = cfg.xAxis[0] || {};
    else if (cfg.xAxis && typeof cfg.xAxis === "object") axis0 = cfg.xAxis;

    const topCatsRaw: Array<string | number> = Array.isArray(axis0.categories)
      ? [...axis0.categories]
      : [];
    const topCats: string[] = topCatsRaw.map((c) => String(c));

    const numericCats = topCats.map((c) => (/\d+/.test(c) ? +c : NaN));
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
        const newCats = topCats.slice(startIdx, sliceEnd);
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
        if (Array.isArray(cfg.series)) {
          cfg.series = (cfg.series as any[]).map((s) => {
            const dataArr = Array.isArray(s.data) ? s.data : [];
            return { ...s, data: dataArr.slice(startIdx, sliceEnd) };
          });
        }
      }
    }

    cfg.chart = {
      ...(cfg.chart || {}),
      events: {
        ...(cfg.chart as any).events,
        drilldown(e: any) {
          const codes: string[] = (e.seriesOptions.data as any[]).map((pt) =>
            String(pt.name)
          );
          this.xAxis[0].setCategories(codes, false);
          this.redraw();
        },
        drillup() {
          this.xAxis[0].setCategories(topCats, false);
          this.redraw();
        },
      },
    };

    const mergedOptions: Highcharts.Options = {
      ...cfg,
      tooltip: { valueDecimals: 2 },
      chart: {
        ...(cfg.chart || {}),
        height: undefined,
        scrollablePlotArea: {
          ...(cfg.chart?.scrollablePlotArea || {}),
          minWidth: 1200,
          scrollPositionX: 0,
        },
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
        callback={(chart) => {
          chartRef.current = chart;
        }}
        containerProps={{
          style: {
            width: "100%",
            background: "#fff",
            ...containerStyle,
          },
        }}
      />
    );
  }
);

export default Chart;
