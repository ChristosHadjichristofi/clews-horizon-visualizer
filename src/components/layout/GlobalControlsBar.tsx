
import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Code } from 'lucide-react';

const GlobalControlsBar = () => {
  const [yearRange, setYearRange] = useState<number[]>([2018, 2050]);
  const [region, setRegion] = useState<string>("eu");
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  
  const handleYearRangeChange = (value: number[]) => {
    setYearRange(value);
  };

  const embedCode = `<iframe 
  src="https://clews-horizon-visualizer.com/embed?yearStart=${yearRange[0]}&yearEnd=${yearRange[1]}&region=${region}" 
  width="100%" 
  height="600" 
  frameborder="0">
</iframe>`;

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
              <SelectItem value="de">Germany</SelectItem>
              <SelectItem value="fr">France</SelectItem>
              <SelectItem value="es">Spain</SelectItem>
              <SelectItem value="it">Italy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Export as PNG</DropdownMenuItem>
              <DropdownMenuItem>Export as CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" size="sm" onClick={() => setEmbedDialogOpen(true)}>
            <Code className="mr-2 h-4 w-4" />
            Embed
          </Button>
        </div>
      </div>

      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
            <DialogDescription>
              Copy this code to embed the visualization in your website
            </DialogDescription>
          </DialogHeader>
          <div className="bg-secondary p-4 rounded-md overflow-x-auto">
            <code className="text-xs">{embedCode}</code>
          </div>
          <Button 
            onClick={() => {
              navigator.clipboard.writeText(embedCode);
            }}
          >
            Copy to Clipboard
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GlobalControlsBar;
