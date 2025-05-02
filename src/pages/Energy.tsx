
import React, { useState } from 'react';
import FilterPanel from '@/components/common/FilterPanel';
import ChartCard from '@/components/common/ChartCard';
import ChartPlaceholder from '@/components/common/ChartPlaceholder';

const energyTechnologies = [
  { id: 'solar-pv', label: 'Solar PV' },
  { id: 'wind-onshore', label: 'Wind Onshore' },
  { id: 'wind-offshore', label: 'Wind Offshore' },
  { id: 'hydro', label: 'Hydropower' },
  { id: 'nuclear', label: 'Nuclear' },
  { id: 'coal', label: 'Coal' },
  { id: 'gas', label: 'Natural Gas' },
  { id: 'biomass', label: 'Biomass' },
  { id: 'geothermal', label: 'Geothermal' },
];

const energyFuelTypes = [
  { id: 'renewable', label: 'Renewable' },
  { id: 'fossil', label: 'Fossil' },
  { id: 'nuclear', label: 'Nuclear' },
];

const costTypes = [
  { id: 'capex', label: 'CapEx' },
  { id: 'opex', label: 'OpEx' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'vom', label: 'VOM' },
  { id: 'fom', label: 'FOM' },
  { id: 'emissions', label: 'Emission Penalty' },
  { id: 'salvage', label: 'Salvage Value' },
];

const Energy = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Energy Module</h1>
      
      <FilterPanel
        title="Energy Filters"
        items={energyTechnologies}
        chartTypes={['stacked', 'grouped']}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ChartCard
          title="Total Annual Capacity by Technology"
          hasDrillDown={true}
          drillDownContent={
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Battery Energy Storage Systems</h3>
              <ChartPlaceholder title="BESS Efficiency & Price" />
              <div className="prose max-w-none">
                <p>Analysis of Battery Energy Storage Systems (BESS) shows trends in efficiency improvements and cost reductions over time.</p>
              </div>
            </div>
          }
        >
          <ChartPlaceholder title="Stacked Bar: Capacity (MWh)" />
        </ChartCard>
        
        <ChartCard 
          title="Total Annual Generation & CO₂ Emissions"
          hasDrillDown={false}
        >
          <ChartPlaceholder title="Dual-axis Chart: Generation and Emissions" />
        </ChartCard>
        
        <ChartCard 
          title="Annual System Cost" 
          hasDrillDown={true}
          drillDownContent={
            <div>
              <FilterPanel
                title="Cost Type Filter"
                items={costTypes}
                chartTypes={['stacked', 'pie']}
              />
              <div className="mt-4">
                <ChartPlaceholder title="Per-Technology Cost Breakdown" />
              </div>
            </div>
          }
        >
          <ChartPlaceholder title="Stacked Bar: System Costs" />
        </ChartCard>
        
        <ChartCard title="System Cost Over Horizon">
          <ChartPlaceholder title="Pie Chart: Aggregated Costs" />
        </ChartCard>
        
        <ChartCard 
          title="Annual CO₂ Emissions per Technology"
          className="md:col-span-2"
        >
          <ChartPlaceholder title="Multi-series Line: Emissions by Technology" />
        </ChartCard>
      </div>
    </div>
  );
};

export default Energy;
