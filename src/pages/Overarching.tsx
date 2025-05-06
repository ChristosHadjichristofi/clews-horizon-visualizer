import React from "react";
import ChartCard from "@/components/common/ChartCard";
import ChartPlaceholder from "@/components/common/ChartPlaceholder";

const energyFuels = [
  { id: "oil", label: "Oil" },
  { id: "natural-gas", label: "Natural Gas" },
  { id: "coal", label: "Coal" },
  { id: "nuclear", label: "Nuclear" },
  { id: "hydro", label: "Hydropower" },
  { id: "wind", label: "Wind" },
  { id: "solar", label: "Solar" },
  { id: "biomass", label: "Biomass" },
  { id: "geothermal", label: "Geothermal" },
];

const scenarios = [
  { id: "reference", label: "Reference" },
  { id: "policy", label: "Current Policy" },
  { id: "net-zero", label: "Net Zero 2050" },
  { id: "delayed-action", label: "Delayed Action" },
  { id: "high-ambition", label: "High Ambition" },
];

const Overarching = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Overarching Results</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Primary Energy Supply by Fuel">
          <ChartPlaceholder title="Stacked Area: Primary Energy" />
        </ChartCard>

        <ChartCard title="Final Energy Demand by Fuel">
          <ChartPlaceholder title="Stacked Area: Final Energy" />
        </ChartCard>

        <ChartCard
          title="GHG Emissions Projection (Scenarios)"
          className="md:col-span-2"
        >
          <ChartPlaceholder title="Multi-series Line: Scenario Emissions" />
        </ChartCard>
      </div>
    </div>
  );
};

export default Overarching;
