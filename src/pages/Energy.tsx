
import React, { useState, useEffect } from 'react';
import FilterPanel from '@/components/common/FilterPanel';
import ChartCard from '@/components/common/ChartCard';
import ChartPlaceholder from '@/components/common/ChartPlaceholder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';

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
  { id: 'chp', label: 'Combined Heat & Power (CHP)' },
  { id: 'bess', label: 'Battery Energy Storage (BESS)' },
  { id: 'pumped-hydro', label: 'Pumped Hydro' },
];

const capacityTypes = [
  { id: 'existing', label: 'Existing' },
  { id: 'new', label: 'New' },
];

const energyFuelTypes = [
  { id: 'renewable', label: 'Renewable' },
  { id: 'fossil', label: 'Fossil' },
  { id: 'nuclear', label: 'Nuclear' },
];

const costTypes = [
  { id: 'capex', label: 'Capital Investment' },
  { id: 'opex', label: 'OpEx' },
  { id: 'fuel', label: 'Fuel Cost' },
  { id: 'vom', label: 'VOM' },
  { id: 'fom', label: 'FOM' },
  { id: 'emissions', label: 'Emission Penalty' },
  { id: 'salvage', label: 'Salvage Value' },
];

const generationTypes = [
  { id: 'electricity', label: 'Electricity' },
  { id: 'heat', label: 'Heat' },
];

const Energy = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const location = useLocation();
  
  // Reset the tab state when navigating to this page
  useEffect(() => {
    setActiveTab('overview');
  }, [location.pathname]);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Energy Module</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6" defaultValue="overview">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="generation">Generation</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Energy Module Overview</CardTitle>
              <CardDescription>
                Key visualizations for the energy sector including generation, capacity, and emissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Select specific tabs to view detailed visualizations for electricity and heat generation,
                capacity, costs, and emissions. Use the filter panels to customize your view.
              </p>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title="Primary Energy Supply by Fuel"
              subtitle="Historical and projected values"
            >
              <ChartPlaceholder title="Stacked Area: Primary Energy Supply" chartType="area" />
            </ChartCard>
            
            <ChartCard
              title="Final Energy Demand by Sector"
              subtitle="Transport, Buildings, Industry, Other"
            >
              <ChartPlaceholder title="Stacked Bar: Energy Demand" />
            </ChartCard>
            
            <ChartCard
              title="CO₂ Emissions by Sector"
              className="md:col-span-2"
            >
              <ChartPlaceholder title="Multi-series Line: Emissions by Sector" chartType="line" />
            </ChartCard>
          </div>
        </TabsContent>
        
        {/* Generation Tab */}
        <TabsContent value="generation" className="space-y-6">
          <FilterPanel
            title="Generation Filters"
            items={energyTechnologies}
            chartTypes={['stacked', 'grouped']}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title="Total Annual Capacity per Technology"
              subtitle="Including CHP, BESS and Pumped Hydro"
              hasDrillDown={true}
              drillDownContent={
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Capacity Analysis</h3>
                  <FilterPanel
                    title="Capacity Type"
                    items={capacityTypes}
                    chartTypes={['grouped']}
                  />
                  <ChartPlaceholder title="Split between Existing and New Capacity" chartType="stacked" />
                  <h3 className="text-lg font-medium mt-4">BESS Capacity Details</h3>
                  <ChartPlaceholder title="Battery Storage Capacity (MWh)" chartType="line" />
                </div>
              }
            >
              <ChartPlaceholder title="Stacked Bar: Capacity (MW)" />
            </ChartCard>
            
            <ChartCard 
              title="Total Annual Generation - Electricity"
              subtitle="With CO₂ emissions on secondary axis"
              hasDrillDown={true}
              drillDownContent={
                <div>
                  <Tabs defaultValue="electricity">
                    <TabsList>
                      <TabsTrigger value="electricity">Electricity</TabsTrigger>
                      <TabsTrigger value="heat">Heat</TabsTrigger>
                    </TabsList>
                    <TabsContent value="electricity">
                      <ChartPlaceholder title="Detailed Electricity Generation" />
                    </TabsContent>
                    <TabsContent value="heat">
                      <ChartPlaceholder title="Detailed Heat Generation" />
                    </TabsContent>
                  </Tabs>
                </div>
              }
            >
              <ChartPlaceholder title="Dual-axis Chart: Generation and Emissions" />
            </ChartCard>
            
            <ChartCard 
              title="Total Annual Generation - Heat"
              subtitle="With CO₂ emissions on secondary axis"
            >
              <ChartPlaceholder title="Dual-axis Chart: Heat Generation and Emissions" />
            </ChartCard>
            
            <ChartCard 
              title="Annual CO₂ Emissions per Technology"
              className="md:col-span-2"
            >
              <ChartPlaceholder title="Multi-series Line: Emissions by Technology" chartType="line" />
            </ChartCard>
          </div>
        </TabsContent>
        
        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <FilterPanel
            title="Cost Type Filter"
            items={costTypes}
            chartTypes={['stacked', 'pie']}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard 
              title="Annual System Cost Breakdown" 
              subtitle="All technologies combined"
              hasDrillDown={true}
              drillDownContent={
                <div>
                  <h3 className="text-lg font-medium mb-4">Cost Components</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Breakdown includes: Capital investment, Salvage value (negative), FOM, 
                    Fuel Cost, VOM, and Emission penalty costs
                  </p>
                  <ChartPlaceholder title="Detailed Cost Analysis" chartType="stacked" />
                </div>
              }
            >
              <ChartPlaceholder title="Stacked Bar: Annual System Costs" />
            </ChartCard>
            
            <ChartCard 
              title="Per-Technology Cost Breakdown"
              hasDrillDown={true}
              drillDownContent={
                <div>
                  <FilterPanel
                    title="Select Technology"
                    items={energyTechnologies}
                    chartTypes={['stacked', 'pie']}
                  />
                  <div className="mt-4">
                    <ChartPlaceholder title="Technology-specific Cost Breakdown" />
                  </div>
                </div>
              }
            >
              <ChartPlaceholder title="Multi-series: Per-Technology Costs" />
            </ChartCard>
            
            <ChartCard 
              title="Total System Cost Over Horizon" 
              subtitle="Aggregated for entire study period"
              className="md:col-span-2"
            >
              <ChartPlaceholder title="Pie Chart: Total System Cost Components" chartType="pie" />
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Energy;
