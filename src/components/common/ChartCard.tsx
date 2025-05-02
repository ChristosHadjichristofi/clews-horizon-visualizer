
import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import DrillDownPanel from './DrillDownPanel';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  hasDrillDown?: boolean;
  drillDownContent?: React.ReactNode;
  className?: string;
}

const ChartCard = ({
  title,
  children,
  hasDrillDown = false,
  drillDownContent,
  className
}: ChartCardProps) => {
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);

  return (
    <>
      <div className={cn('chart-card', className)}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="chart-card-title">{title}</h3>
          {hasDrillDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDrillDownOpen(true)}
              className="h-8 w-8 p-0"
            >
              <ArrowUpRight size={18} />
            </Button>
          )}
        </div>
        <div className="chart-container">
          {children}
        </div>
      </div>
      
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
