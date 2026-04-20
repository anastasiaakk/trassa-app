/**
 * Перед electron-builder удаляем старый packaged-app/win-unpacked (иначе EBUSY на app.asar).
 * Несколько попыток — Windows часто отпускает файлы с задержкой.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dir = path.join(__dirname, "..", "packaged-app", "win-unpacked");
if (!fs.existsSync(dir)) return;

/* Старый артефакт при asar:true — мешает пересборке при asar:false */
const staleAsar = path.join(dir, "resources", "app.asar");
if (fs.existsSync(staleAsar)) {
  try {
    fs.unlinkSync(staleAsar);
    console.log("[clean-release-win-unpacked] удалён устаревший resources/app.asar");
  } catch {
    /* продолжим полным rm */
  }
}

function sleep(ms) {
  try {
    execSync(`powershell -NoProfile -Command "Start-Sleep -Milliseconds ${ms}"`, {
      stdio: "ignore",
      windowsHide: true,
    });
  } catch {
    /* ignore */
  }
}

let lastErr;
for (let i = 0; i < 6; i++) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("[clean-release-win-unpacked] удалён packaged-app/win-unpacked");
    return;
  } catch (e) {
    lastErr = e;
    if (i < 5) {
      console.warn(`[clean-release-win-unpacked] попытка ${i + 1}/6 не удалась, ждём… (${e.code || e.message})`);
      sleep(2000);
    }
  }
}

console.error(
  "[clean-release-win-unpacked] Закройте «Трасса», окно проводника в packaged-app/, повторите."
);
console.error(lastErr?.message || lastErr);
process.exit(1);
