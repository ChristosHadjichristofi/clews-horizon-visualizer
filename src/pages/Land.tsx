
import React from 'react';
import FilterPanel from '@/components/common/FilterPanel';
import ChartCard from '@/components/common/ChartCard';
import ChartPlaceholder from '@/components/common/ChartPlaceholder';

const landCoverTypes = [
  { id: 'cropland', label: 'Cropland' },
  { id: 'grassland', label: 'Grassland' },
  { id: 'forest', label: 'Forest' },
  { id: 'wetlands', label: 'Wetlands' },
  { id: 'settlements', label: 'Settlements' },
  { id: 'other-land', label: 'Other Land' },
];

const cropTypes = [
  { id: 'cereals', label: 'Cereals' },
  { id: 'oilseeds', label: 'Oilseeds' },
  { id: 'pulses', label: 'Pulses' },
  { id: 'roots-tubers', label: 'Roots & Tubers' },
  { id: 'fruits-vegetables', label: 'Fruits & Vegetables' },
  { id: 'forage', label: 'Forage' },
  { id: 'bioenergy', label: 'Bioenergy Crops' },
];

const Land = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Land Module</h1>
      
      <FilterPanel
        title="Land Filters"
        items={[...landCoverTypes, ...cropTypes]}
        chartTypes={['stacked', 'line', 'area']}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Land Cover Distribution">
          <ChartPlaceholder title="Stacked Area: Land Cover" />
        </ChartCard>
        
        <ChartCard title="Agricultural Land by Crop Type">
          <ChartPlaceholder title="Stacked Area: Crop Distribution" />
        </ChartCard>
        
        <ChartCard 
          title="Agricultural Inputs"
          hasDrillDown={true}
          drillDownContent={
            <div className="grid grid-cols-2 gap-4">
              <ChartPlaceholder title="Fertilizer Use" />
              <ChartPlaceholder title="Irrigation Water" />
              <ChartPlaceholder title="Energy Input" />
              <ChartPlaceholder title="Agricultural Machinery" />
            </div>
          }
        >
          <ChartPlaceholder title="Multi-series Line: Agricultural Inputs" />
        </ChartCard>
        
        <ChartCard title="Land-use GHG Emissions">
          <ChartPlaceholder title="Stacked Area: Land Emissions" />
        </ChartCard>
      </div>
    </div>
  );
};

export default Land;
