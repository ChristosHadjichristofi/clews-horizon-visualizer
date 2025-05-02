
import React, { useState } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import DrillDownPanel from './DrillDownPanel';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  hasDrillDown?: boolean;
  drillDownContent?: React.ReactNode;
  className?: string;
  downloadOptions?: {
    png?: boolean;
    csv?: boolean;
  };
}

const ChartCard = ({
  title,
  subtitle,
  children,
  hasDrillDown = false,
  drillDownContent,
  className,
  downloadOptions = { png: true, csv: true }
}: ChartCardProps) => {
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);

  // Mock download handlers - these will be replaced with actual Highcharts export functionality
  const handleDownloadPNG = () => {
    console.log(`Downloading ${title} as PNG`);
    // In real implementation: chart.exportChart({ type: 'image/png' });
  };

  const handleDownloadCSV = () => {
    console.log(`Downloading ${title} data as CSV`);
    // In real implementation: chart.downloadCSV();
  };

  return (
    <>
      <Card className={cn('chart-card', className)}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="chart-card-title">{title}</h3>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex gap-1">
              {downloadOptions.png && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadPNG}
                  className="h-8 w-8 p-0"
                  title="Download as PNG"
                >
                  <Download size={18} />
                </Button>
              )}
              
              {hasDrillDown && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDrillDownOpen(true)}
                  className="h-8 w-8 p-0"
                  title="Show detailed analysis"
                >
                  <ArrowUpRight size={18} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="chart-container">
          {children}
        </CardContent>
      </Card>
      
      {hasDrillDown && drillDownContent && (
        <DrillDownPanel 
          title={title}
          isOpen={isDrillDownOpen}
          onClose={() => setIsDrillDownOpen(false)}
        >
          {drillDownContent}
        </DrillDownPanel>
      )}
    </>
  );
};

export default ChartCard;
