
import React from 'react';
import { LineChart, BarChart, PieChart, AreaChart } from 'lucide-react';

interface ChartPlaceholderProps {
  title?: string;
  subtitle?: string;
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'stacked';
  height?: string;
  className?: string;
}

const ChartPlaceholder = ({ 
  title = "Chart Preview", 
  subtitle,
  chartType = 'bar',
  height = "h-full",
  className 
}: ChartPlaceholderProps) => {
  const getIcon = () => {
    switch(chartType) {
      case 'line':
        return <LineChart size={48} className="text-gray-400 mb-2" />;
      case 'pie':
        return <PieChart size={48} className="text-gray-400 mb-2" />;
      case 'area':
        return <AreaChart size={48} className="text-gray-400 mb-2" />;
      case 'stacked':
      case 'bar':
      default:
        return <BarChart size={48} className="text-gray-400 mb-2" />;
    }
  };
  
  return (
    <div className={`flex flex-col items-center justify-center w-full ${height} rounded-md border-2 border-dashed border-gray-300 p-4 bg-muted/30 ${className}`}>
      {getIcon()}
      <p className="text-muted-foreground text-sm font-medium text-center">{title}</p>
      {subtitle && (
        <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>
      )}
      <p className="text-muted-foreground text-xs mt-2 italic">Highcharts will render here</p>
    </div>
  );
};

export default ChartPlaceholder;
