import buildBuildingsFinalEnergyDemandByFuel from "./buildings-final-energy-demand-by-fuel.config.json";
import buildBuildingsRenovationSavings from "./buildings-renovation-savings.config.json";
import buildingsDemandAndRenovation from "./buildings-demand-and-renovation.config.json";
import buildingsGhGEmissions from "./buildings-ghg-emissions.config.json";

export const configs = {
  "buildings-final-energy-demand-by-fuel":
    buildBuildingsFinalEnergyDemandByFuel,
  "buildings-renovation-savings": buildBuildingsRenovationSavings,
  "buildings-demand-and-renovation": buildingsDemandAndRenovation,
  "buildings-ghg-emissions": buildingsGhGEmissions,
};

export type ChartKey = keyof typeof configs;
