
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  Car, 
  Building2, 
  Factory, 
  Compass, 
  Leaf, 
  Droplets,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const modules = [
  { 
    name: 'Energy', 
    path: '/energy', 
    icon: <BarChart3 size={24} className="text-energy" />,
    color: 'bg-energy/10 border-energy/20',
    description: 'Explore electricity & heat generation, capacity, emissions, and system costs.'
  },
  { 
    name: 'Transport', 
    path: '/transport', 
    icon: <Car size={24} className="text-transport" />,
    color: 'bg-transport/10 border-transport/20',
    description: 'Analyze vehicle fleets, fuel demand, and emissions across transport modes.'
  },
  { 
    name: 'Buildings', 
    path: '/buildings', 
    icon: <Building2 size={24} className="text-buildings" />,
    color: 'bg-buildings/10 border-buildings/20',
    description: 'Examine energy demand, renovation impacts, and emissions in the buildings sector.'
  },
  { 
    name: 'Industry', 
    path: '/industry', 
    icon: <Factory size={24} className="text-industry" />,
    color: 'bg-industry/10 border-industry/20',
    description: 'Review energy consumption and emissions across industrial sectors.'
  },
  { 
    name: 'Overarching', 
    path: '/overarching', 
    icon: <Compass size={24} className="text-overarching" />,
    color: 'bg-overarching/10 border-overarching/20',
    description: 'View system-wide results across energy supply, demand, and emission projections.'
  },
  { 
    name: 'Land', 
    path: '/land', 
    icon: <Leaf size={24} className="text-land" />,
    color: 'bg-land/10 border-land/20',
    description: 'Track land use changes, agricultural production, and related emissions.'
  },
  { 
    name: 'Water', 
    path: '/water', 
    icon: <Droplets size={24} className="text-water" />,
    color: 'bg-water/10 border-water/20',
    description: 'Monitor water resources, consumption patterns, and energy for water services.'
  },
];

const Index = () => {
  return (
    <div className="container mx-auto py-12">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">CLEWs-EU Horizon Visualizer</h1>
        <p className="text-lg text-muted-foreground">
          Explore integrated visualization of Climate, Land, Energy, and Water systems across the European Union.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Card key={module.path} className={`${module.color} border`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-semibold flex items-center">
                {module.icon}
                <span className="ml-2">{module.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-foreground/70 min-h-[60px]">
                {module.description}
              </CardDescription>
              <Button asChild className="mt-4" variant="outline">
                <Link to={module.path}>
                  Explore
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Index;
