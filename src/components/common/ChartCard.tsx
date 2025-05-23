import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  className,
}) => (
  <Card className={cn("chart-card", className)}>
    <CardHeader className="pb-2">
      {title && <h3 className="chart-card-title">{title}</h3>}
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </CardHeader>

    {/* NEW: Make chart container horizontally scrollable if chart overflows */}
    <CardContent className="overflow-auto">
      <div className="min-w-[1200px]">{children}</div>
    </CardContent>
  </Card>
);

export default ChartCard;
