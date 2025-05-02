
import React from 'react';
import { LineChart } from 'lucide-react';

interface ChartPlaceholderProps {
  title?: string;
  chartType?: 'bar' | 'line' | 'pie' | 'area';
}

const ChartPlaceholder = ({ title = "Chart Preview", chartType = 'bar' }: ChartPlaceholderProps) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full rounded-md border-2 border-dashed border-gray-300 p-4 bg-muted/30">
      <LineChart size={48} className="text-gray-400 mb-2" />
      <p className="text-muted-foreground text-sm font-medium">{title}</p>
      <p className="text-muted-foreground text-xs mt-1 italic">Highcharts will render here</p>
    </div>
  );
};

export default ChartPlaceholder;
