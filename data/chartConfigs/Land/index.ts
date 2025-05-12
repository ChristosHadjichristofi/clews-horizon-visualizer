import areaByCategory from "./land-use-area-by-category.config.json";
import byType from "./land-crop-area-by-type.config.json";
import byWater from "./land-crop-area-by-water.config.json";
import byInput from "./land-crop-area-by-input.config.json";
import combinedYield from "./land-crop-combined-yield.config.json";
import emissions from "./land-use-emissions.config.json";
import landEnergyByUseByCover from "./land-energy-use-by-cover.config.json";
import forestBiomassProd from "./forest-biomass-production.config.json";
import cropProdByCode from "./land-crop-production-by-code.config.json";
import cropImport from "./crop-imports-by-code.config.json";
import cropExport from "./crop-exports-by-code.config.json";

export const configs = {
  "land-use-area-by-category": areaByCategory,
  "land-crop-area-by-type": byType,
  "land-crop-area-by-water": byWater,
  "land-crop-area-by-input": byInput,
  "land-crop-combined-yield": combinedYield,
  "land-use-emissions": emissions,
  "land-energy-use-by-cover": landEnergyByUseByCover,
  "forest-biomass-production": forestBiomassProd,
  "land-crop-production-by-code": cropProdByCode,
  "crop-imports-by-code": cropImport,
  "crop-exports-by-code": cropExport,
};

export type ChartKey = keyof typeof configs;
