/**
 * Копирует готовый установщик из release/ в public/downloads и dist/downloads
 * под именем trassa-setup.exe — чтобы ссылка «Скачать» на сайте отдавала актуальный файл.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const src = path.join(root, "release", `trassa-setup-${version}.exe`);
const fileName = "trassa-setup.exe";

function main() {
  if (!fs.existsSync(src)) {
    console.warn("[sync-setup-download] нет файла (пропуск):", src);
    process.exit(0);
  }

  const destDirs = [
    path.join(root, "public", "downloads"),
    path.join(root, "dist", "downloads"),
  ];

  for (const dir of destDirs) {
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, fileName);
    fs.copyFileSync(src, dest);
    console.log("[sync-setup-download]", path.relative(root, dest));
  }
}

main();
