import React from "react";
import { useGlobalControls } from "@/contexts/GlobalControlsContext";
import ChartCard from "@/components/common/ChartCard";
import ChartPlaceholder from "@/components/common/ChartPlaceholder";
import chartInfo from "@/data/chartConfigs/Land/chartInfo.json";
import { configs } from "@/data/chartConfigs/Land";
import type { Options } from "highcharts";
import ChartWithControls from "@/components/common/ChartWithControls";

const Land: React.FC = () => {
  const { yearRange } = useGlobalControls();

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Land Module</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {chartInfo.cards.map((card: any) => {
          const cfgKey = card.key as keyof typeof configs;
          const cfg = configs[cfgKey];
          const spanClass = card.colSpan === 2 ? "md:col-span-2" : "";

          return (
            <ChartCard
              key={cfgKey}
              title={card.title}
              subtitle={card.subtitle}
              className={spanClass}
            >
              {cfg ? (
                <ChartWithControls
                  options={cfg as unknown as Options}
                  yearRange={yearRange}
                />
              ) : (
                <ChartPlaceholder
                  title={card.title}
                  chartType={card.chartType}
                />
              )}
            </ChartCard>
          );
        })}
      </div>
    </div>
  );
};

export default Land;
