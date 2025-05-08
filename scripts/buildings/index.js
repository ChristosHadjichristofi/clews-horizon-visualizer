import { buildBuildingsFinalEnergyDemandByFuelChart } from "./buildBuildingsEnergyDemByFuel.js";
import { buildBuildingsRenovationSavingsChart } from "./buildBuildingsRenovationSavings.js";
import { buildBuildingsDemandAndRenovationChart } from "./buildBuildingsDemandAndRenovationChart.js";
import { buildBuildingsEmissionsChart } from "./buildBuildingsEmissions.js";

export async function buildBuildingsModules() {
  console.log("--- Buildings Module ---");

  // Graph 1
  await buildBuildingsFinalEnergyDemandByFuelChart();

  // Graph 2
  await buildBuildingsRenovationSavingsChart();

  // Graph 3
  await buildBuildingsDemandAndRenovationChart();

  // Graph 4
  await buildBuildingsEmissionsChart();

  console.log("Buildings Module complete");
}
