
import React from 'react';
import FilterPanel from '@/components/common/FilterPanel';
import ChartCard from '@/components/common/ChartCard';
import ChartPlaceholder from '@/components/common/ChartPlaceholder';

const buildingFuels = [
  { id: 'electricity', label: 'Electricity' },
  { id: 'natural-gas', label: 'Natural Gas' },
  { id: 'heating-oil', label: 'Heating Oil' },
  { id: 'biomass', label: 'Biomass' },
  { id: 'district-heating', label: 'District Heating' },
  { id: 'solar-thermal', label: 'Solar Thermal' },
];

const renovationTypes = [
  { id: 'insulation', label: 'Insulation' },
  { id: 'windows', label: 'Windows Replacement' },
  { id: 'heating-system', label: 'Heating System' },
  { id: 'cooling-system', label: 'Cooling System' },
  { id: 'deep-renovation', label: 'Deep Renovation' },
];

const Buildings = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Buildings Module</h1>
      
      <FilterPanel
        title="Buildings Filters"
        items={[...buildingFuels, ...renovationTypes]}
        chartTypes={['stacked', 'line']}
        hasSecondaryAxis={true}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Final Energy Demand by Fuel">
          <ChartPlaceholder title="Stacked Bar: Energy Consumption" />
        </ChartCard>
        
        <ChartCard 
          title="Useful Energy Savings by Renovation Activity"
          hasDrillDown={true}
          drillDownContent={
            <div>
              <FilterPanel
                items={renovationTypes}
                chartTypes={['stacked', 'column']}
              />
              <div className="mt-4">
                <ChartPlaceholder title="Renovation Impact Details" />
              </div>
            </div>
          }
        >
          <ChartPlaceholder title="Column Chart: Energy Savings" />
        </ChartCard>
        
        <ChartCard 
          title="GHG Emissions"
          className="md:col-span-2"
          hasDrillDown={true}
          drillDownContent={
            <div className="grid grid-cols-2 gap-4">
              <ChartPlaceholder title="With Renovation" />
              <ChartPlaceholder title="Without Renovation" />
              <div className="col-span-2">
                <ChartPlaceholder title="Emissions Reduction Potential" />
              </div>
            </div>
          }
        >
          <ChartPlaceholder title="Line Chart: Emissions Trends" />
        </ChartCard>
      </div>
    </div>
  );
};

export default Buildings;
