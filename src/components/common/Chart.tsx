import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import * as ExportingNS from "highcharts/modules/exporting";
import * as ExportDataNS from "highcharts/modules/export-data";
import * as OfflineExportingNS from "highcharts/modules/offline-exporting";

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
  containerStyle?: React.CSSProperties;
}

export default function Chart({ options, containerStyle }: ChartProps) {
  const mergedOptions: Highcharts.Options = {
    ...options,
    chart: {
      ...(options.chart || {}),
      height: undefined,
      scrollablePlotArea: {
        ...(options.chart?.scrollablePlotArea || {}),
        minWidth: 1200,
        scrollPositionX: 0,
      },
      events: { ...(options.chart?.events || {}) },
    },
    exporting: {
      ...(options.exporting || {}),
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
