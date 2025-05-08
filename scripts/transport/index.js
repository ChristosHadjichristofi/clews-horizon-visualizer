import { buildTransportCapacityChart } from "./buildTransportCapacity.js";
import { buildTransportNewRegistrationsChart } from "./buildTransportNewRegistrations.js";
import { buildTransportDistanceChart } from "./buildTransportDistance.js";
import { buildTransportFuelConsumptionByModeChart } from "./buildTransportFuelConsumptionByMode.js";
import { buildTransportEmissionsByModeChart } from "./buildTransportEmissionsByMode.js";

export async function buildTransportModules() {
  console.log("--- Transport Module ---");

  // Graph 1
  await buildTransportCapacityChart();

  // Graph 2
  await buildTransportNewRegistrationsChart();

  // Graph 3
  await buildTransportDistanceChart();

  // Graph 4
  await buildTransportFuelConsumptionByModeChart();

  // Graph 5
  await buildTransportEmissionsByModeChart();

  console.log("Transport Module complete");
}
