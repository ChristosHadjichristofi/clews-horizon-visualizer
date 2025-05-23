import fs from "fs/promises";
import path from "path";
import { exportSheetToCsv } from "./utils/excel.js";
import { buildEnergyModules } from "./energy/index.js";
import { buildTransportModules } from "./transport/index.js";
import { buildBuildingsModules } from "./buildings/index.js";
import { buildIndustryModules } from "./industry/index.js";
import { buildOverArchingModules } from "./overarching/index.js";
import { buildLandModules } from "./land/index.js";
import { buildWaterModules } from "./water/index.js";

async function copyDirectory(srcDir, destDir) {
  await fs.rm(destDir, { recursive: true, force: true });
  if (fs.cp) {
    await fs.cp(srcDir, destDir, { recursive: true });
  } else {
    await fs.mkdir(destDir, { recursive: true });
    for (const entry of await fs.readdir(srcDir, { withFileTypes: true })) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

async function exportExcelSheets(dataSrc) {
  exportSheetToCsv(
    path.join(dataSrc, "xlsx", "euclews_elw_20240628.xlsx"),
    "InputActivityRatio",
    path.join(dataSrc, "csv", "exported", "InputActivityRatio.csv")
  );

  exportSheetToCsv(
    path.join(dataSrc, "xlsx", "euclews_elw_20240628.xlsx"),
    "OutputActivityRatio",
    path.join(dataSrc, "csv", "exported", "OutputActivityRatio.csv")
  );

  exportSheetToCsv(
    path.join(dataSrc, "xlsx", "euclews_elw_20240628.xlsx"),
    "VariableCost",
    path.join(dataSrc, "csv", "exported", "VariableCost.csv")
  );

  exportSheetToCsv(
    path.join(dataSrc, "xlsx", "euclews_elw_20240628.xlsx"),
    "EmissionActivityRatio",
    path.join(dataSrc, "csv", "exported", "EmissionActivityRatio.csv")
  );

  exportSheetToCsv(
    path.join(dataSrc, "xlsx", "euclews_elw_20240628.xlsx"),
    "EmissionsPenalty",
    path.join(dataSrc, "csv", "exported", "EmissionsPenalty.csv")
  );

  exportSheetToCsv(
    path.join(dataSrc, "xlsx", "Technology_List_Energy.xlsx"),
    "Energy Module",
    path.join(dataSrc, "csv", "exported", "EnergyModule_Tech_List.csv")
  );

  exportSheetToCsv(
    path.join(dataSrc, "xlsx", "Technology_List_Land.xlsx"),
    "Sheet1",
    path.join(dataSrc, "csv", "exported", "LandModule_Tech_List.csv")
  );
}

async function main() {
  const projectRoot = process.cwd();
  const dataSrc = path.join(projectRoot, "data");
  const dataDest = path.join(projectRoot, "src", "data");

  console.log("Exporting Excel sheets to CSV…");
  await exportExcelSheets(dataSrc);
  console.log("Excel sheets exported to CSV");

  // Build the modules
  // await buildEnergyModules();
  // await buildTransportModules();
  // await buildBuildingsModules();
  await buildIndustryModules();
  // await buildOverArchingModules();
  // await buildLandModules();
  // await buildWaterModules();
  console.log("All modules built");
  // End of modules building

  console.log(`Copying ${dataSrc} → ${dataDest}…`);
  await copyDirectory(dataSrc, dataDest);
  console.log("Data folder copied into src/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
