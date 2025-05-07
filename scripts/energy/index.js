import { buildTotalCapacity } from "./buildTotalCapacity.js";
import {
  buildHeatGenerationChart,
  buildElectricityGenerationChart,
} from "./buildGeneration.js";
import {
  buildSystemCostChart,
  buildSystemCostByTechChart,
  buildSystemCostHorizonChart,
} from "./totalSystemCost.js";
import { buildEmissionsByYearByTechChart } from "./buildEmissions.js";

export async function buildEnergyModules() {
  console.log("--- Energy Module ---");

  // Graph 1
  await buildTotalCapacity();

  // Graph 2a + 2b
  await buildElectricityGenerationChart();
  await buildHeatGenerationChart();

  // Graph 3
  await buildSystemCostChart();

  // Graph 4
  await buildSystemCostByTechChart();

  // Graph 5
  await buildSystemCostHorizonChart();

  // Graph 6
  await buildEmissionsByYearByTechChart();

  console.log("Energy Module complete");
}
