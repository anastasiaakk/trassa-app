/**
 * Добавляет в russiaAdmin1Ne50m.json полигоны Запорожской, Херсонской, ДНР/Донецкой, ЛНР/Луганской
 * из EugeneBorshch/ukraine_geojson (границы административные, данные OSM).
 *
 * Ожидаются файлы в корне проекта:
 * tmp_UA_09_Luhanska.geojson, tmp_UA_14_Donetska.geojson, tmp_UA_23_Zaporizka.geojson, tmp_UA_65_Khersonska.geojson
 *
 * Запуск: node scripts/mergeUaRegionsIntoAdmin1.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const target = path.join(root, "src/data/russiaAdmin1Ne50m.json");

const UA_FILES = [
  { file: "tmp_UA_23_Zaporizka.geojson", iso: "UA-23", name: "Запорожская" },
  { file: "tmp_UA_65_Khersonska.geojson", iso: "UA-65", name: "Херсонская" },
  { file: "tmp_UA_14_Donetska.geojson", iso: "UA-14", name: "ДНР" },
  { file: "tmp_UA_09_Luhanska.geojson", iso: "UA-09", name: "ЛНР" },
];

const DISTRICT_SOUTH = 3;

function toFeature(raw, { iso, name }) {
  const g = raw.geometry ?? raw;
  if (!g || !g.type) throw new Error(`Нет geometry для ${iso}`);
  return {
    type: "Feature",
    properties: { district: DISTRICT_SOUTH, iso, name },
    geometry: g,
  };
}

const base = JSON.parse(fs.readFileSync(target, "utf8"));
const extra = [];

for (const spec of UA_FILES) {
  const p = path.join(root, spec.file);
  if (!fs.existsSync(p)) {
    console.error("Нет файла:", p);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  if (raw.type === "FeatureCollection") {
    for (const f of raw.features) extra.push(toFeature(f, spec));
  } else {
    extra.push(toFeature(raw, spec));
  }
}

const merged = {
  type: "FeatureCollection",
  features: [...base.features, ...extra],
};
fs.writeFileSync(target, JSON.stringify(merged));
console.log("Было полигонов:", base.features.length, "→ стало:", merged.features.length, "→", target);
