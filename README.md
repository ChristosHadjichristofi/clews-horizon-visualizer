# Steps to run this project

1. Make sure you have NodeJS installed
2. Make sure you have npm installed
3. Open project in VScode for example
4. Open a terminal
   1. In the root of this folder, run `npm install`
   2. After installation of packages is completed, run `npm run dev`

# Steps to change the data

1. Head to `data/csv` folder and add all necessary csv files
2. Head to `data/xlsx` folder and add all necessary xlsx files

# Have in mind

1. Do not make any changes to the names of the Sheets in the Excel files, or this won't work correctly.
2. After every change you make in the files, you need to stop the process, and run again `npm run dev`.
3. Right now every script that parses csvs/makes calculations is in the scripts folder, and in its respective "module" folder. I.e all scripts generating the configs for charts of Energy are in `scripts/energy`. Each script generates at least one chart config, which can be found in the respective "module" folder in `data/chartConfigs` folder. Inside every "module" chargConfig folder, two more files exist:
   1. `chartInfo.json` which is used to map the files as cards in the UI
   2. `index.ts` which is actually imported in the UI and "binds" the json configuration files of Highcharts so as it can be imported and used in the UI
