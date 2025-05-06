import React from "react";
import ChartCard from "@/components/common/ChartCard";
import ChartPlaceholder from "@/components/common/ChartPlaceholder";

const transportModes = [
  { id: "road-passenger", label: "Road (Passenger)" },
  { id: "road-freight", label: "Road (Freight)" },
  { id: "rail-passenger", label: "Rail (Passenger)" },
  { id: "rail-freight", label: "Rail (Freight)" },
  { id: "aviation", label: "Aviation" },
  { id: "shipping", label: "Shipping" },
];

const vehicleTechnologies = [
  { id: "ice-gasoline", label: "ICE (Gasoline)" },
  { id: "ice-diesel", label: "ICE (Diesel)" },
  { id: "hev", label: "Hybrid Electric (HEV)" },
  { id: "phev", label: "Plug-in Hybrid (PHEV)" },
  { id: "bev", label: "Battery Electric (BEV)" },
  { id: "fcev", label: "Fuel Cell (FCEV)" },
];

const Transport = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Transport Module</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Vehicle Fleet Stock by Technology">
          <ChartPlaceholder title="Stacked Area: Fleet Composition" />
        </ChartCard>

        <ChartCard title="New Vehicle Registrations">
          <ChartPlaceholder title="Multi-series Line: New Registrations" />
        </ChartCard>

        <ChartCard title="Fuel Demand by Mode & Total">
          <ChartPlaceholder title="Stacked Bar + Line: Fuel Demand" />
        </ChartCard>

        <ChartCard title="GHG Emissions by Mode & Total">
          <ChartPlaceholder title="Stacked Bar: GHG Emissions" />
        </ChartCard>
      </div>
    </div>
  );
};

export default Transport;
