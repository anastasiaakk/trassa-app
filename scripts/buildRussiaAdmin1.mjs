/**
 * Собирает russiaAdmin1Ne50m.json из Natural Earth admin-1 + привязка к id федерального округа (1–8).
 * Запуск: node scripts/buildRussiaAdmin1.mjs
 *
 * После этого добавьте полигоны Запорожской, Херсонской, Донецкой и Луганской областей:
 * скачайте четыре файла из https://github.com/EugeneBorshch/ukraine_geojson (tmp_UA_*.geojson в корень)
 * и выполните: node scripts/mergeUaRegionsIntoAdmin1.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const adminPath = path.join(root, "admin1_50m.json");
if (!fs.existsSync(adminPath)) {
  console.error("Положите admin1_50m.json в корень проекта (Natural Earth ne_50m admin-1).");
  process.exit(1);
}

/** ISO 3166-2 как в Natural Earth → номер федерального округа из page2MapGeo */
const ISO_TO_DISTRICT = {
  // Центральный
  "RU-BEL": 1,
  "RU-BRY": 1,
  "RU-VLA": 1,
  "RU-VOR": 1,
  "RU-IVA": 1,
  "RU-KLU": 1,
  "RU-KOS": 1,
  "RU-KRS": 1,
  "RU-LIP": 1,
  "RU-MOS": 1,
  "RU-MOW": 1,
  "RU-ORL": 1,
  "RU-RYA": 1,
  "RU-SMO": 1,
  "RU-TAM": 1,
  "RU-TVE": 1,
  "RU-TUL": 1,
  "RU-YAR": 1,
  // Северо-Западный
  "RU-ARK": 2,
  "RU-VLG": 2,
  "RU-KGD": 2,
  "RU-LEN": 2,
  "RU-MUR": 2,
  "RU-NGR": 2,
  "RU-PSK": 2,
  "RU-KR": 2,
  "RU-KO": 2,
  "RU-NEN": 2,
  "RU-SPE": 2,
  // Южный (+ Крым/Севастополь в данных NE под UA-кодами)
  "UA-43": 3,
  "UA-40": 3,
  "RU-KDA": 3,
  "RU-AST": 3,
  "RU-VGG": 3,
  "RU-ROS": 3,
  "RU-AD": 3,
  "RU-KL": 3,
  // Северо-Кавказский
  "RU-STA": 4,
  "RU-IN": 4,
  "RU-DA": 4,
  "RU-KB": 4,
  "RU-KC": 4,
  "RU-SE": 4,
  "RU-CE": 4,
  // Приволжский
  "RU-PER": 5,
  "RU-NIZ": 5,
  "RU-KIR": 5,
  "RU-SAM": 5,
  "RU-ORE": 5,
  "RU-PNZ": 5,
  "RU-SAR": 5,
  "RU-ULY": 5,
  "RU-BA": 5,
  "RU-ME": 5,
  "RU-MO": 5,
  "RU-TA": 5,
  "RU-UD": 5,
  "RU-CU": 5,
  // Уральский
  "RU-KGN": 6,
  "RU-SVE": 6,
  "RU-TYU": 6,
  "RU-CHE": 6,
  "RU-KHM": 6,
  "RU-YAN": 6,
  // Сибирский
  "RU-ALT": 7,
  "RU-KYA": 7,
  "RU-IRK": 7,
  "RU-KEM": 7,
  "RU-NVS": 7,
  "RU-OMS": 7,
  "RU-TOM": 7,
  "RU-BU": 8,
  "RU-TY": 7,
  "RU-KK": 7,
  // Дальневосточный
  "RU-CHU": 8,
  "RU-YEV": 8,
  "RU-PRI": 8,
  "RU-KHA": 8,
  "RU-KAM": 8,
  "RU-ZAB": 8,
  "RU-SA": 8,
  "RU-AMU": 8,
  "RU-MAG": 8,
  "RU-SAK": 8,
};

const raw = JSON.parse(fs.readFileSync(adminPath, "utf8"));
const rus = raw.features.filter((f) => f.properties?.adm0_a3 === "RUS");

const features = [];
for (const f of rus) {
  const iso = f.properties.iso_3166_2;
  if (iso === "RU-AL") continue;

  const district = ISO_TO_DISTRICT[iso];
  if (district == null) {
    console.warn("Нет округа для", iso, f.properties.name_ru);
    continue;
  }
  features.push({
    type: "Feature",
    properties: {
      district,
      iso,
      name: f.properties.name_ru ?? f.properties.name,
    },
    geometry: f.geometry,
  });
}

const out = { type: "FeatureCollection", features };
const outPath = path.join(root, "src/data/russiaAdmin1Ne50m.json");
fs.writeFileSync(outPath, JSON.stringify(out));
console.log("Записано", features.length, "полигонов →", outPath, "bytes", fs.statSync(outPath).size);
