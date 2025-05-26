import transportCapacityAnnual from "./transport-capacity-annual.config.json";
import transportNewRegistrations from "./transport-new-registrations.config.json";
import transportDistancePassenger from "./transport-distance-total-passenger.config.json";
import transportDistanceFreight from "./transport-distance-total-freight.config.json";
import transportFuelConsumptionFreight from "./transport-fuel-consumption-freight.config.json";
import transportFuelConsumptionPassenger from "./transport-fuel-consumption-passenger.config.json";
import transportFuelConsumptionTransport from "./transport-fuel-consumption-transport.config.json";
import transportEmissionsByMode from "./transport-emissions-by-mode.config.json";

export const configs = {
  "transport-capacity-annual": transportCapacityAnnual,
  "transport-new-registrations": transportNewRegistrations,
  "transport-distance-passenger": transportDistancePassenger,
  "transport-distance-freight": transportDistanceFreight,
  "transport-fuel-consumption-freight": transportFuelConsumptionFreight,
  "transport-fuel-consumption-passenger": transportFuelConsumptionPassenger,
  "transport-fuel-consumption-transport": transportFuelConsumptionTransport,
  "transport-emissions-by-mode": transportEmissionsByMode,
};

export type ChartKey = keyof typeof configs;
