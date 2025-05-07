import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalControls } from "@/contexts/GlobalControlsContext";

const GlobalControlsBar = () => {
  const { yearRange, setYearRange, region, setRegion } = useGlobalControls();

  const handleYearRangeChange = (value: number[]) => {
    setYearRange(value as [number, number]);
  };

  return (
    <div className="bg-secondary/50 py-2 px-4 border-b">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
        <div className="flex flex-col w-full md:w-1/3">
          <span className="text-xs text-muted-foreground">Year Range</span>
          <div className="px-2">
            <Slider
              defaultValue={[2018, 2050]}
              min={2018}
              max={2050}
              step={1}
              value={yearRange}
              onValueChange={handleYearRangeChange}
              className="my-2"
            />
            <div className="flex justify-between text-xs">
              <span>{yearRange[0]}</span>
              <span>{yearRange[1]}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-full md:w-1/3 md:mx-4">
          <span className="text-xs text-muted-foreground">Region/Country</span>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eu">European Union</SelectItem>
              {/* <SelectItem value="de">Germany</SelectItem>
              <SelectItem value="fr">France</SelectItem>
              <SelectItem value="es">Spain</SelectItem>
              <SelectItem value="it">Italy</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default GlobalControlsBar;
