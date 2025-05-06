import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
// Only need exporting for the default Highcharts menu
import "highcharts/modules/exporting";

import chartInfo from "@/data/chartConfigs/Energy/chartInfo.json";
import { configs } from "@/data/chartConfigs/Energy";

import ChartPlaceholder from "@/components/common/ChartPlaceholder";
import ChartCard from "@/components/common/ChartCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const Energy: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const location = useLocation();

  useEffect(() => {
    setActiveTab("overview");
  }, [location.pathname]);

  // Helper to inject scrollablePlotArea into any chart config
  const withScrolling = (cfg: Highcharts.Options): Highcharts.Options => ({
    ...cfg,
    chart: {
      ...cfg.chart,
      // spacingBottom: 40,

      // When the plotted width exceeds minWidth, arrows appear
      scrollablePlotArea: {
        minWidth: 1200, // adjust based on how many points you want visible
        scrollPositionX: 0,
      },
    },
  });

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Energy Module</h1>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full mb-6"
        defaultValue="overview"
      >
        <TabsList className="grid grid-cols-3 max-w-md">
          {chartInfo.tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {chartInfo.tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tab.cards.map((card: any) => {
                if (!card.configFile) {
                  return (
                    <ChartCard
                      key={card.key}
                      title={card.title}
                      subtitle={card.subtitle}
                      className={
                        card.colSpan === 2 ? "md:col-span-2" : undefined
                      }
                    >
                      <ChartPlaceholder
                        title={card.title}
                        chartType={card.chartType}
                      />
                    </ChartCard>
                  );
                }
                const cfgKey = card.configFile.replace(".config.json", "");
                const cfg = configs[cfgKey];
                if (!cfg) {
                  return (
                    <ChartCard
                      key={cfgKey}
                      title={card.title}
                      subtitle={card.subtitle}
                      className={
                        card.colSpan === 2 ? "md:col-span-2" : undefined
                      }
                    >
                      <ChartPlaceholder
                        title={card.title}
                        chartType={card.chartType}
                      />
                    </ChartCard>
                  );
                }
                const cardOptions = withScrolling(cfg);
                return (
                  <ChartCard
                    key={cfgKey}
                    title={card.title}
                    subtitle={card.subtitle}
                    className={card.colSpan === 2 ? "md:col-span-2" : undefined}
                  >
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={cardOptions}
                      containerProps={{
                        style: { width: "100%", height: "100%" },
                      }}
                    />
                  </ChartCard>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Energy;
