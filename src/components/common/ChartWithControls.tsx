import React, { useRef, useState, useEffect, useCallback } from "react";
import Highcharts from "highcharts";
import Chart, { ChartProps } from "./Chart";

export default function ChartWithControls(props: ChartProps) {
  const chartRef = useRef<Highcharts.Chart | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [seriesStates, setSeriesStates] = useState<boolean[]>(
    () => props.options.series?.map(() => true) ?? []
  );

  const toggleSeries = useCallback(
    (index: number) => {
      const chart = chartRef.current;
      if (!chart) return;
      const series = chart.series[index];
      if (series) {
        const visible = series.visible;
        visible ? series.hide() : series.show();
        const newStates = [...seriesStates];
        newStates[index] = !visible;
        setSeriesStates(newStates);
      }
    },
    [seriesStates]
  );

  const setAllSeries = useCallback(
    (show: boolean) => {
      const chart = chartRef.current;
      if (!chart || !props.options.series) return;

      const updatedSeries = props.options.series.map((s) => ({
        ...s,
        visible: show,
      }));

      chart.update({ series: updatedSeries }, true, true);
      setSeriesStates(updatedSeries.map(() => show));
    },
    [props.options.series]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="mb-2 flex justify-start items-center">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="text-sm text-gray-700 border border-gray-300 bg-white px-3 py-1.5 rounded-md hover:bg-gray-100 shadow-sm transition"
        >
          Toggle Series
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-[36rem] rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black ring-opacity-5 p-4 animate-fade-in">
          <div className="flex justify-between mb-3">
            <button
              onClick={() => setAllSeries(true)}
              className="text-xs font-medium bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded transition"
            >
              Show All
            </button>
            <button
              onClick={() => setAllSeries(false)}
              className="text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition"
            >
              Hide All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 max-h-64 overflow-y-auto border-t border-gray-100 pt-3 pr-1 text-sm text-gray-800 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {(props.options.series ?? []).map((s, i) => (
              <label
                key={i}
                className="flex items-start gap-2 whitespace-normal break-words leading-snug"
              >
                <input
                  type="checkbox"
                  checked={seriesStates[i]}
                  onChange={() => toggleSeries(i)}
                  className="mt-1"
                />
                <span className="w-full">{s.name ?? `Series ${i + 1}`}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2">
        <Chart {...props} ref={chartRef} />
      </div>
    </div>
  );
}
