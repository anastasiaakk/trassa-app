/**
 * Минимальные PNG в public/, если файлов ещё нет (чтобы сборка и Electron не отдавали 404).
 * Замените своими ассетами при необходимости.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "public");
/** 1×1 px PNG (серый), валидный для всех браузеров */
const MIN_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const FILES = ["page1-bg.png", "v2721_115.png", "page2-hero-navy.png"];

function main() {
  if (!fs.existsSync(ROOT)) {
    fs.mkdirSync(ROOT, { recursive: true });
  }
  for (const name of FILES) {
    const dest = path.join(ROOT, name);
    if (fs.existsSync(dest)) continue;
    fs.writeFileSync(dest, MIN_PNG);
    console.log(`[ensure-public-assets] created placeholder: public/${name}`);
  }
}

main();
