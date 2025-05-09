import primarySupply from "./overarching-primary-supply-by-fuel.config.json";
import finalEnergyDemandByFuel from "./final-energy-demand-by-fuel.config.json";
import overarchingEmissions from "./overarching-emissions.config.json";

export const configs = {
  "overarching-primary-supply-by-fuel": primarySupply,
  "final-energy-demand-by-fuel": finalEnergyDemandByFuel,
  "overarching-emissions": overarchingEmissions,
};

export type ChartKey = keyof typeof configs;
