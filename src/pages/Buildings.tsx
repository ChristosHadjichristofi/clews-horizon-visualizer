import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ChartCard from "@/components/common/ChartCard";
import ChartPlaceholder from "@/components/common/ChartPlaceholder";
import {
  ChartContainer,
  ChartTooltipContent,
  ChartTooltip,
} from "@/components/ui/chart";

// Building fuels and renovation data based on section 1.3 requirements
const buildingFuels = [
  { id: "electricity", label: "Electricity" },
  { id: "natural-gas", label: "Natural Gas" },
  { id: "heating-oil", label: "Heating Oil" },
  { id: "biomass", label: "Biomass" },
  { id: "district-heating", label: "District Heating" },
  { id: "solar-thermal", label: "Solar Thermal" },
];

const renovationTypes = [
  { id: "insulation", label: "Insulation" },
  { id: "windows", label: "Windows Replacement" },
  { id: "heating-system", label: "Heating System" },
  { id: "cooling-system", label: "Cooling System" },
  { id: "deep-renovation", label: "Deep Renovation" },
];

const Buildings = () => {
  // State for tracking selected filters
  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [selectedRenovations, setSelectedRenovations] = useState<string[]>([]);
  const [chartType, setChartType] = useState("stacked");

  // Handler for filter changes
  const handleFuelFilterChange = (fuels: string[]) => {
    setSelectedFuels(fuels);
    console.log("Selected fuels:", fuels);
  };

  const handleRenovationFilterChange = (renovations: string[]) => {
    setSelectedRenovations(renovations);
    console.log("Selected renovations:", renovations);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Buildings Module</h1>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Buildings Sector Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This module visualizes building energy demand, renovation impacts,
            and emissions data as specified in section 1.3 of the CLEWs-EU model
            visualization requirements.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Chart 1: Final Energy Demand by Fuel - Required by section 1.3.1 */}
        <ChartCard title="Final Energy Demand by Fuel">
          <ChartPlaceholder
            title="Final Energy Demand by Fuel Type"
            subtitle="Stacked representation of energy consumption by fuel source"
            chartType="stacked"
          />
        </ChartCard>

        {/* Chart 2: Useful Energy Savings by Renovation Activity - Required by section 1.3.1 */}
        <ChartCard title="Useful Energy Savings by Renovation Activity">
          <ChartPlaceholder
            title="Energy Savings from Building Renovations"
            subtitle="Impact of renovation activities on energy consumption"
            chartType="bar"
          />
        </ChartCard>

        {/* Chart 3: GHG Emissions - Required by section 1.3.1 */}
        <ChartCard
          title="GHG Emissions in Buildings Sector"
          className="md:col-span-2"
        >
          <ChartPlaceholder
            title="Buildings GHG Emissions Trends"
            subtitle="Annual greenhouse gas emissions from the buildings sector"
            chartType="line"
          />
        </ChartCard>

        {/* Additional chart for deeper analysis */}
        <ChartCard title="Energy Intensity by Building Type">
          <ChartPlaceholder
            title="Energy Consumption per Square Meter"
            subtitle="Comparative analysis across building categories"
            chartType="bar"
          />
        </ChartCard>

        {/* Additional chart for deeper analysis */}
        <ChartCard title="Renovation Cost-Benefit Analysis">
          <ChartPlaceholder
            title="Investment vs. Energy Savings"
            subtitle="Financial implications of renovation activities"
            chartType="line"
          />
        </ChartCard>
      </div>
    </div>
  );
};

export default Buildings;
