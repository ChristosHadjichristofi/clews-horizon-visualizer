import waterUseBySector from "./water-use-by-sector.config.json";
import waterAbstractionBySrc from "./water-abstraction-by-source.config.json";
import waterEnergyUsebyEndUse from "./water-energy-use-by-end-use.config.json";
import waterIrrigationByCrop from "./water-irrigation-by-crop.config.json";
import waterBalance from "./water-balance.config.json";

export const configs = {
  "water-use-by-sector": waterUseBySector,
  "water-abstraction-by-source": waterAbstractionBySrc,
  "water-energy-use-by-end-use": waterEnergyUsebyEndUse,
  "water-irrigation-by-crop": waterIrrigationByCrop,
  "water-balance": waterBalance,
};

export type ChartKey = keyof typeof configs;
