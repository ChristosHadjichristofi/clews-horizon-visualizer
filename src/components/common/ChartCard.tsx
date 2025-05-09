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
    <CardContent className="chart-container">{children}</CardContent>
  </Card>
);

export default ChartCard;
