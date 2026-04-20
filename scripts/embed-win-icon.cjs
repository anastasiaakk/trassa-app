/**
 * Встраивает electron-assets/icon.ico в .exe (rcedit).
 * Нужно, потому что при signAndEditExecutable: false electron-builder не вызывает rcedit — остаётся иконка Electron.
 *
 * Использование:
 *   node scripts/embed-win-icon.cjs [путь\\к\\файлу.exe]
 * По умолчанию: packaged-app/win-unpacked/Трасса.exe
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const icoPath = path.join(root, "electron-assets", "icon.ico");

const defaultExe = path.join(root, "packaged-app", "win-unpacked", "Трасса.exe");
const exePath = path.resolve(process.argv[2] || defaultExe);

async function main() {
  if (!fs.existsSync(icoPath)) {
    console.error("[embed-win-icon] нет файла:", icoPath);
    process.exit(1);
  }
  if (!fs.existsSync(exePath)) {
    console.error("[embed-win-icon] нет исполняемого файла:", exePath);
    process.exit(1);
  }
  const { rcedit } = await import("rcedit");
  await rcedit(exePath, { icon: icoPath });
  console.log("[embed-win-icon] OK:", exePath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
