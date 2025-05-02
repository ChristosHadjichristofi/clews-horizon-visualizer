
import React, { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FilterItem {
  id: string;
  label: string;
}

interface FilterPanelProps {
  title?: string;
  items?: FilterItem[];
  chartTypes?: string[];
  hasSecondaryAxis?: boolean;
  onFilterChange?: (selectedItems: string[]) => void;
  onChartTypeChange?: (chartType: string) => void;
  onSecondaryAxisChange?: (enabled: boolean) => void;
  className?: string;
}

const FilterPanel = ({
  title = 'Filters',
  items = [],
  chartTypes = ['stacked', 'grouped', 'line'],
  hasSecondaryAxis = false,
  onFilterChange,
  onChartTypeChange,
  onSecondaryAxisChange,
  className
}: FilterPanelProps) => {
  const [open, setOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedChartType, setSelectedChartType] = useState(chartTypes[0]);
  const [secondaryAxisEnabled, setSecondaryAxisEnabled] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleItemToggle = (itemId: string) => {
    const newSelectedItems = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];
    
    setSelectedItems(newSelectedItems);
    onFilterChange?.(newSelectedItems);
  };
  
  const handleChartTypeChange = (chartType: string) => {
    setSelectedChartType(chartType);
    onChartTypeChange?.(chartType);
  };
  
  const handleSecondaryAxisChange = (checked: boolean) => {
    setSecondaryAxisEnabled(checked);
    onSecondaryAxisChange?.(checked);
  };

  if (isCollapsed) {
    return (
      <Button 
        variant="ghost" 
        className="mb-2" 
        onClick={() => setIsCollapsed(false)}
      >
        <ChevronsUpDown size={16} className="mr-1" />
        Show Filters
      </Button>
    );
  }

  return (
    <div className={cn('filter-panel', className)}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-sm">{title}</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsCollapsed(true)}
          className="h-6 w-6 p-0"
        >
          <X size={14} />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.length > 0 && (
          <div>
            <Label className="text-xs mb-1 block">Filter Items</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between text-sm"
                >
                  {selectedItems.length > 0
                    ? `${selectedItems.length} selected`
                    : "Select items..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-full min-w-[200px]">
                <Command>
                  <CommandInput placeholder="Search items..." />
                  <CommandEmpty>No item found.</CommandEmpty>
                  <CommandGroup>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleItemToggle(item.id)}
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => handleItemToggle(item.id)}
                          />
                          <span>{item.label}</span>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            selectedItems.includes(item.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
        
        {chartTypes.length > 1 && (
          <div>
            <Label className="text-xs mb-1 block">Chart Type</Label>
            <div className="flex flex-wrap gap-2">
              {chartTypes.map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={selectedChartType === type ? "default" : "outline"}
                  onClick={() => handleChartTypeChange(type)}
                  className="text-xs capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {hasSecondaryAxis && (
          <div>
            <Label className="text-xs mb-1 block">Options</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={secondaryAxisEnabled}
                onCheckedChange={handleSecondaryAxisChange}
                id="secondary-axis"
              />
              <Label htmlFor="secondary-axis" className="text-xs">Secondary Axis</Label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;
