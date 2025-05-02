
import React from 'react';
import FilterPanel from '@/components/common/FilterPanel';
import ChartCard from '@/components/common/ChartCard';
import ChartPlaceholder from '@/components/common/ChartPlaceholder';

const transportModes = [
  { id: 'road-passenger', label: 'Road (Passenger)' },
  { id: 'road-freight', label: 'Road (Freight)' },
  { id: 'rail-passenger', label: 'Rail (Passenger)' },
  { id: 'rail-freight', label: 'Rail (Freight)' },
  { id: 'aviation', label: 'Aviation' },
  { id: 'shipping', label: 'Shipping' },
];

const vehicleTechnologies = [
  { id: 'ice-gasoline', label: 'ICE (Gasoline)' },
  { id: 'ice-diesel', label: 'ICE (Diesel)' },
  { id: 'hev', label: 'Hybrid Electric (HEV)' },
  { id: 'phev', label: 'Plug-in Hybrid (PHEV)' },
  { id: 'bev', label: 'Battery Electric (BEV)' },
  { id: 'fcev', label: 'Fuel Cell (FCEV)' },
];

const Transport = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Transport Module</h1>
      
      <FilterPanel
        title="Transport Filters"
        items={[...transportModes, ...vehicleTechnologies]}
        chartTypes={['stacked', 'line']}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Vehicle Fleet Stock by Technology">
          <ChartPlaceholder title="Stacked Area: Fleet Composition" />
        </ChartCard>
        
        <ChartCard title="New Vehicle Registrations">
          <ChartPlaceholder title="Multi-series Line: New Registrations" />
        </ChartCard>
        
        <ChartCard
          title="Fuel Demand by Mode & Total"
          hasDrillDown={true}
          drillDownContent={
            <div>
              <FilterPanel
                items={transportModes}
                chartTypes={['stacked', 'line']}
              />
              <div className="mt-4">
                <ChartPlaceholder title="Detailed Fuel Demand by Mode" />
              </div>
            </div>
          }
        >
          <ChartPlaceholder title="Stacked Bar + Line: Fuel Demand" />
        </ChartCard>
        
        <ChartCard
          title="GHG Emissions by Mode & Total"
          hasDrillDown={true}
          drillDownContent={
            <div>
              <FilterPanel
                items={transportModes}
                chartTypes={['line']}
              />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <ChartPlaceholder title="Absolute Emissions" />
                <ChartPlaceholder title="Emissions Intensity (per km)" />
              </div>
            </div>
          }
        >
          <ChartPlaceholder title="Stacked Bar: GHG Emissions" />
        </ChartCard>
      </div>
    </div>
  );
};

export default Transport;
