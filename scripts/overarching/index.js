import { buildFinalEnergyDemandByFuelChart } from "./buildFinalEnergyDemandByFuel.js";
import { buildOverarchingEmissionsChart } from "./buildOverarchingEmissions.js";
import { buildPrimarySupplyByFuelChart } from "./buildOverarchingPrimarySupply.js";

export async function buildOverArchingModules() {
  console.log("--- Overarching Module ---");

  await buildPrimarySupplyByFuelChart();

  await buildFinalEnergyDemandByFuelChart();

  await buildOverarchingEmissionsChart();

  console.log("Overarching Module complete");
}
