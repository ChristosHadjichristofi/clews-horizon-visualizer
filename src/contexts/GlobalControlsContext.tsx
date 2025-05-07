import React, {
  createContext,
  useContext,
  useState,
  PropsWithChildren,
} from "react";

interface GlobalControls {
  yearRange: [number, number];
  setYearRange: (r: [number, number]) => void;
  region: string;
  setRegion: (r: string) => void;
}

const GlobalControlsContext = createContext<GlobalControls | undefined>(
  undefined
);

export const GlobalControlsProvider: React.FC<PropsWithChildren<{}>> = ({
  children,
}) => {
  const [yearRange, setYearRange] = useState<[number, number]>([2018, 2050]);
  const [region, setRegion] = useState<string>("eu");

  return (
    <GlobalControlsContext.Provider
      value={{ yearRange, setYearRange, region, setRegion }}
    >
      {children}
    </GlobalControlsContext.Provider>
  );
};

export function useGlobalControls() {
  const ctx = useContext(GlobalControlsContext);
  if (!ctx)
    throw new Error("useGlobalControls must be inside GlobalControlsProvider");
  return ctx;
}
