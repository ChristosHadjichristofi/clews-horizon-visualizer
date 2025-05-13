import { buildWaterUseBySectorCharts } from "./buildWaterUseBySectorCharts.js";
import { buildWaterAbstractionCharts } from "./buildWaterAbstractionCharts.js";
import { buildWaterEnergyUseByEndUseCharts } from "./buildWaterEnergyUseByEndUseCharts.js";
import { buildWaterBalanceCharts } from "./buildWaterBalanceCharts.js";
import { buildIrrigationWaterUseCharts } from "./buildIrrigationWaterUseCharts.js";

export async function buildWaterModules() {
  console.log("--- Water Module ---");

  // Graph 1
  await buildWaterUseBySectorCharts();

  // Graph 2
  await buildWaterAbstractionCharts();

  // Graph 3
  await buildWaterEnergyUseByEndUseCharts();

  // Graph 4
  await buildIrrigationWaterUseCharts();

  // Graph 5
  await buildWaterBalanceCharts();

  console.log("Water Module complete");
}
