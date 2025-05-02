
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DrillDownPanelProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const DrillDownPanel = ({
  title,
  isOpen,
  onClose,
  children
}: DrillDownPanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex justify-end">
      <div className={`bg-background border-l w-full max-w-2xl h-full overflow-y-auto shadow-xl animate-slide-in-right`}>
        <div className="sticky top-0 bg-background z-10 border-b p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DrillDownPanel;
