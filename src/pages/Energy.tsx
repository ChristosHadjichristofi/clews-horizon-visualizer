import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import ChartPlaceholder from "@/components/common/ChartPlaceholder";
import ChartCard from "@/components/common/ChartCard";
import Chart from "@/components/common/Chart";
import chartInfo from "@/data/chartConfigs/Energy/chartInfo.json";
import { configs } from "@/data/chartConfigs/Energy";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useGlobalControls } from "@/contexts/GlobalControlsContext";

const Energy: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const location = useLocation();
  const { yearRange } = useGlobalControls();

  useEffect(() => {
    setActiveTab("overview");
  }, [location.pathname]);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Energy Module</h1>
      {/* <p className="text-sm italic">
        Showing years {yearRange[0]}–{yearRange[1]}
      </p> */}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full mb-6"
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
                const spanClass = card.colSpan === 2 ? "md:col-span-2" : "";

                // if there's no configFile, show placeholder
                if (!card.configFile) {
                  return (
                    <ChartCard
                      key={card.key}
                      title={card.title}
                      subtitle={card.subtitle}
                      className={spanClass}
                    >
                      <ChartPlaceholder
                        title={card.title}
                        chartType={card.chartType}
                      />
                    </ChartCard>
                  );
                }

                // otherwise load the config
                const cfgKey = card.configFile.replace(".config.json", "");
                const cfg = configs[cfgKey];
                if (!cfg) {
                  return (
                    <ChartCard
                      key={cfgKey}
                      title={card.title}
                      subtitle={card.subtitle}
                      className={spanClass}
                    >
                      <ChartPlaceholder
                        title={card.title}
                        chartType={card.chartType}
                      />
                    </ChartCard>
                  );
                }

                return (
                  <ChartCard
                    key={cfgKey}
                    title={card.title}
                    subtitle={card.subtitle}
                    className={spanClass}
                  >
                    {/* pass yearRange into Chart */}
                    <Chart options={cfg} yearRange={yearRange} />
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
