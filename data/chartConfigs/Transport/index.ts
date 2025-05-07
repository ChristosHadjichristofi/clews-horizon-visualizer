import transportCapacityAnnual from "./transport-capacity-annual.config.json";
import transportNewRegistrations from "./transport-new-registrations.config.json";
import transportDistancePassenger from "./transport-distance-passenger.config.json";
import transportDistanceFreight from "./transport-distance-freight.config.json";
import transportFuelConsumptionPassengerTech from "./transport-fuel-consumption-passenger-tech.config.json";
import transportFuelConsumptionFreightTech from "./transport-fuel-consumption-freight-tech.config.json";

export const configs = {
  "transport-capacity-annual": transportCapacityAnnual,
  "transport-new-registrations": transportNewRegistrations,
  "transport-distance-passenger": transportDistancePassenger,
  "transport-distance-freight": transportDistanceFreight,
  "transport-fuel-consumption-passenger": transportFuelConsumptionPassengerTech,
  "transport-fuel-consumption-freight": transportFuelConsumptionFreightTech,
};

export type ChartKey = keyof typeof configs;
