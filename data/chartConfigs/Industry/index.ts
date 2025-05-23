import byFuel from "./industry-fuel-by-fuel.config.json";
import byTech from "./industry-fuel-by-tech.config.json";
import byCode from "./industry-fuel-by-code.config.json";
import bySector from "./industry-emissions-by-sector.config.json";
import total from "./industry-emissions-total.config.json";

import chemPetro from "./industry-fuel-by-code-chemical-petrochemical.config.json";
import foodDrink from "./industry-fuel-by-code-food-beverages-tobacco.config.json";
import ironSteel from "./industry-fuel-by-code-iron-steel.config.json";
import nonMetal from "./industry-fuel-by-code-non-metallic-minerals.config.json";
import otherIndustries from "./industry-fuel-by-code-other-industries.config.json";
import paperPrint from "./industry-fuel-by-code-paper-pulp-printing.config.json";

export const configs = {
  "industry-fuel-by-fuel": byFuel,
  "industry-fuel-by-tech": byTech,
  "industry-fuel-by-code": byCode,
  "industry-emissions-by-sector": bySector,
  "industry-emissions-total": total,

  "industry-fuel-by-code-chemical-petrochemical": chemPetro,
  "industry-fuel-by-code-food-beverages-tobacco": foodDrink,
  "industry-fuel-by-code-iron-and-steel": ironSteel,
  "industry-fuel-by-code-non-metallic-minerals": nonMetal,
  "industry-fuel-by-code-paper-pulp-and-print": paperPrint,
  "industry-fuel-by-code-non-ferrous-metals": otherIndustries,
};

export type ChartKey = keyof typeof configs;
