
import React from 'react';
import FilterPanel from '@/components/common/FilterPanel';
import ChartCard from '@/components/common/ChartCard';
import ChartPlaceholder from '@/components/common/ChartPlaceholder';

const waterSources = [
  { id: 'surface', label: 'Surface Water' },
  { id: 'groundwater', label: 'Groundwater' },
  { id: 'desalination', label: 'Desalination' },
  { id: 'reused', label: 'Treated/Reused Water' },
  { id: 'rainwater', label: 'Rainwater Harvesting' },
];

const waterSectors = [
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'industry', label: 'Industry' },
  { id: 'energy', label: 'Energy Production' },
  { id: 'municipal', label: 'Municipal' },
  { id: 'ecosystem', label: 'Ecosystem Services' },
];

const Water = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Water Module</h1>
      
      <FilterPanel
        title="Water Filters"
        items={[...waterSources, ...waterSectors]}
        chartTypes={['stacked', 'line', 'column']}
        hasSecondaryAxis={true}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Water Abstraction by Source">
          <ChartPlaceholder title="Stacked Bar: Water Sources" />
        </ChartCard>
        
        <ChartCard title="Water Use by Sector">
          <ChartPlaceholder title="Stacked Bar: Water Consumption" />
        </ChartCard>
        
        <ChartCard 
          title="Energy for Water"
          hasDrillDown={true}
          drillDownContent={
            <div className="grid grid-cols-2 gap-4">
              <ChartPlaceholder title="Pumping Energy" />
              <ChartPlaceholder title="Treatment Energy" />
              <ChartPlaceholder title="Distribution Energy" />
              <ChartPlaceholder title="Wastewater Treatment Energy" />
            </div>
          }
        >
          <ChartPlaceholder title="Stacked Bar: Energy for Water Systems" />
        </ChartCard>
        
        <ChartCard title="Water Balance">
          <ChartPlaceholder title="Area: Water Availability vs Demand" />
        </ChartCard>
      </div>
    </div>
  );
};

export default Water;
