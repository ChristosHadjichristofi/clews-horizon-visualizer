
import React from 'react';
import FilterPanel from '@/components/common/FilterPanel';
import ChartCard from '@/components/common/ChartCard';
import ChartPlaceholder from '@/components/common/ChartPlaceholder';

const industrySectors = [
  { id: 'iron-steel', label: 'Iron & Steel' },
  { id: 'chemicals', label: 'Chemicals' },
  { id: 'cement', label: 'Cement' },
  { id: 'pulp-paper', label: 'Pulp & Paper' },
  { id: 'aluminum', label: 'Aluminum' },
  { id: 'food', label: 'Food Processing' },
  { id: 'other', label: 'Other Industries' },
];

const Industry = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Industry Module</h1>
      
      <FilterPanel
        title="Industry Filters"
        items={industrySectors}
        chartTypes={['stacked', 'grouped', 'line']}
        hasSecondaryAxis={true}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ChartCard 
          title="Final Energy Demand by Sector & Total"
          hasDrillDown={true}
          drillDownContent={
            <div>
              <FilterPanel
                items={industrySectors}
                chartTypes={['stacked', 'line']}
              />
              <div className="mt-4">
                <ChartPlaceholder title="Sector-specific Energy Demand" />
              </div>
            </div>
          }
        >
          <ChartPlaceholder title="Grouped Stacked Bar: Energy by Sector" />
        </ChartCard>
        
        <ChartCard 
          title="GHG Emissions by Sector & Total"
          hasDrillDown={true}
          drillDownContent={
            <div className="grid grid-cols-2 gap-4">
              <ChartPlaceholder title="Process Emissions" />
              <ChartPlaceholder title="Energy-related Emissions" />
              <div className="col-span-2">
                <ChartPlaceholder title="Emission Intensity per Output" />
              </div>
            </div>
          }
        >
          <ChartPlaceholder title="Dual-axis: Emissions by Sector" />
        </ChartCard>
      </div>
    </div>
  );
};

export default Industry;
