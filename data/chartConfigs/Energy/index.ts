import totalCapacity from "./total-annual-capacity.config.json";
import generationElectricity from "./total-generation-electricity.config.json";
import generationHeat from "./total-generation-heat.config.json";
import systemCostAnnual from "./system-cost-annual.config.json";
import systemCostByTech from "./system-cost-by-tech.config.json";
import systemCostHorizon from "./system-cost-horizon.config.json";
import emissionsByYearByTech from "./emissions-by-year-by-tech.config.json";

export const configs = {
  "total-annual-capacity": totalCapacity,
  "total-generation-electricity": generationElectricity,
  "total-generation-heat": generationHeat,
  "system-cost-annual": systemCostAnnual,
  "system-cost-by-tech": systemCostByTech,
  "system-cost-horizon": systemCostHorizon,
  "emissions-by-year-by-tech": emissionsByYearByTech,
};

export type ChartKey = keyof typeof configs;
