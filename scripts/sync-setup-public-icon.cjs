/** Копирует electron-assets/icon.png → setup-wizard/public/icon.png (favicon в окне установки). */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "electron-assets", "icon.png");
const destDir = path.join(root, "setup-wizard", "public");
const dest = path.join(destDir, "icon.png");

if (!fs.existsSync(src)) {
  console.error("[sync-setup-public-icon] нет", src);
  process.exit(1);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("[sync-setup-public-icon]", dest);
