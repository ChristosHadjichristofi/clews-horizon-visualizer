import byFuel from "./industry-fuel-by-fuel.config.json";
import byTech from "./industry-fuel-by-tech.config.json";
import byCode from "./industry-fuel-by-code.config.json";
import bySector from "./industry-emissions-by-sector.config.json";
import total from "./industry-emissions-total.config.json";

export const configs = {
  "industry-fuel-by-fuel": byFuel,
  "industry-fuel-by-tech": byTech,
  "industry-fuel-by-code": byCode,
  "industry-emissions-by-sector": bySector,
  "industry-emissions-total": total,
};

export type ChartKey = keyof typeof configs;
