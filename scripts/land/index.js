import { buildCropTradeCharts } from "./buildCropTrade.js";
import { buildEnergyUseByLandCoverCharts } from "./buildEnergyUseByLandCover.js";
import { buildForestBiomassProductionCharts } from "./buildForestBiomassProduction.js";
import { buildLandCropUseCharts } from "./buildLandCropUse.js";
import {
  buildLandCropYieldCharts,
  buildLandCropProductionCharts,
} from "./buildLandCropYield.js";
import { buildLandUseCharts } from "./buildLandUse.js";
import { buildLandUseEmissionsCharts } from "./buildLandUseEmissions.js";

export async function buildLandModules() {
  console.log("--- Land Module ---");

  // Graph 1
  await buildLandUseCharts();

  // Graph 2,3,4
  await buildLandCropUseCharts();

  // Graph 5
  await buildLandCropYieldCharts();

  // Graph 6
  await buildLandUseEmissionsCharts();

  // Graph 7
  await buildEnergyUseByLandCoverCharts();

  // Graph 8
  await buildForestBiomassProductionCharts();

  // Graph 9
  await buildLandCropProductionCharts();

  // Graph 10,11
  await buildCropTradeCharts();

  console.log("Land Module complete");
}
