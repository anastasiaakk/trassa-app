/**
 * Копирует packaged-app/win-unpacked → setup-wizard/payload-app и собирает неоморфный установщик
 * (release/trassa-setup-<version>.exe).
 */
/* Без подписи: иначе electron-builder на Windows ищет сертификат и падает с кодом 1 (часто на portable). */
if (process.env.CSC_IDENTITY_AUTO_DISCOVERY === undefined) {
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
}

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { rmWithRetry, tryUnlinkPayloadAsar } = require("./fs-rm-retry.cjs");

const root = path.join(__dirname, "..");
const unpacked = path.join(root, "packaged-app", "win-unpacked");
const payloadDest = path.join(root, "setup-wizard", "payload-app");
const setupDir = path.join(root, "setup-wizard");

function runChecked(command, options) {
  try {
    execSync(command, { stdio: "inherit", shell: true, ...options });
  } catch (error) {
    console.error(`[build-neo-setup] команда завершилась ошибкой: ${command}`);
    if (typeof error?.status === "number") {
      console.error("[build-neo-setup] exit code:", error.status);
    }
    if (error?.stdout) {
      const stdout = String(error.stdout).trim();
      if (stdout) {
        console.error("[build-neo-setup] captured stdout:\n" + stdout);
      }
    }
    if (error?.stderr) {
      const stderr = String(error.stderr).trim();
      if (stderr) {
        console.error("[build-neo-setup] captured stderr:\n" + stderr);
      }
    }
    throw error;
  }
}

if (!fs.existsSync(unpacked)) {
  console.error("Ошибка: нет packaged-app/win-unpacked. Сначала выполните: electron-builder --win dir");
  process.exit(1);
}

fs.rmSync(payloadDest, { recursive: true, force: true });
fs.cpSync(unpacked, payloadDest, { recursive: true });
console.log("[build-neo-setup] payload-app ← win-unpacked");

if (!fs.existsSync(path.join(setupDir, "node_modules"))) {
  console.log("[build-neo-setup] npm install в setup-wizard…");
  runChecked("npm install", { cwd: setupDir });
}

console.log("[build-neo-setup] запуск: npm run build (vite + electron-builder portable)…");
runChecked("npm run build", { cwd: setupDir });

const setupDist = path.join(root, "release", "setup-dist");
const releaseRoot = path.join(root, "release");
const pkgVersion = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8")
).version;
const expectedExe = `trassa-setup-${pkgVersion}.exe`;

const exes = fs.existsSync(setupDist)
  ? fs.readdirSync(setupDist).filter((f) => f.endsWith(".exe"))
  : [];

/* Не вызывать embed-win-icon (rcedit) для установщика: electron-builder уже вшил ASAR integrity
 * в exe; любое изменение бинарника после этого ломает проверку → «installer integrity check has failed».
 * Иконка задаётся в setup-wizard/package.json → build.win.icon (без пост-обработки). */

let copiedInstaller = false;
/** Имя скопированного файла в release (совпадает с artifactName electron-builder). */
let installerExeName = null;
if (exes.length === 0) {
  console.warn("[build-neo-setup] не найден .exe в release/setup-dist");
} else {
  installerExeName = exes.includes(expectedExe) ? expectedExe : exes[0];
  fs.mkdirSync(releaseRoot, { recursive: true });
  fs.copyFileSync(
    path.join(setupDist, installerExeName),
    path.join(releaseRoot, installerExeName)
  );
  console.log(`[build-neo-setup] ${installerExeName} → release/`);
  copiedInstaller = true;
}

/** В release/ оставляем только один установщик; промежуточная папка setup-dist не нужна. */
if (fs.existsSync(setupDist)) {
  try {
    rmWithRetry(setupDist);
    console.log("[build-neo-setup] удалён release/setup-dist");
  } catch (e) {
    console.warn(
      "[build-neo-setup] не удалось удалить release/setup-dist (занято). Удалите вручную или: npm run release:prune —",
      e.message || e
    );
  }
}

if (copiedInstaller && installerExeName && fs.existsSync(releaseRoot)) {
  for (const f of fs.readdirSync(releaseRoot)) {
    if (f === installerExeName) continue;
    const full = path.join(releaseRoot, f);
    try {
      if (f === "win-unpacked") tryUnlinkPayloadAsar(full);
      rmWithRetry(full);
      console.log("[build-neo-setup] удалено из release/:", f);
    } catch (e) {
      console.warn(
        "[build-neo-setup] не удалено из release/ (занято):",
        f,
        "— закройте Проводник/приложения в этой папке, затем: npm run release:prune",
        e.message || e
      );
    }
  }
}
