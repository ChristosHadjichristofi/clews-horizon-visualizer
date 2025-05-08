import { buildIndustryFuelConsumptionCharts } from "./buildIndustryFuelConsumption.js";
import { buildIndustryEmissionsCharts } from "./buildIndustryEmissions.js";

export async function buildIndustryModules() {
  console.log("--- Industry Module ---");

  // Graph 1,2,3
  await buildIndustryFuelConsumptionCharts();

  // Graph 4
  await buildIndustryEmissionsCharts();

  console.log("Industry Module complete");
}
