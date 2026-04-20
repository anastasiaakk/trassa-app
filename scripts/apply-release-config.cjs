/**
 * Перед vite build: пишет public/app-update.json и electron-assets/update.json
 * из release-config.json или переменной окружения TRASSA_PUBLIC_URL.
 *
 * Укажите один раз публичный HTTPS-адрес сайта (без слэша в конце), например:
 *   https://example.com
 * После деплоя сайта манифест будет по адресу:
 *   https://example.com/app-update.json
 * Установщик — как и кнопка «Скачать»: /downloads/trassa-setup.exe
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const releasePath = path.join(root, "release-config.json");

/** Прямой URL JSON (например GitHub Releases: .../releases/latest/download/app-update.json) */
function readExplicitManifestUrl() {
  const fromEnv = process.env.TRASSA_MANIFEST_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  try {
    if (!fs.existsSync(releasePath)) return "";
    const j = JSON.parse(fs.readFileSync(releasePath, "utf8"));
    const u = j?.manifestUrl;
    return typeof u === "string" ? u.trim().replace(/\/+$/, "") : "";
  } catch {
    return "";
  }
}

function readPublicBaseUrl() {
  const fromEnv = process.env.TRASSA_PUBLIC_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  try {
    if (!fs.existsSync(releasePath)) return "";
    const j = JSON.parse(fs.readFileSync(releasePath, "utf8"));
    const u = j?.publicBaseUrl;
    return typeof u === "string" ? u.trim().replace(/\/+$/, "") : "";
  } catch {
    return "";
  }
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const version = pkg.version || "0.0.0";
  const base = readPublicBaseUrl();
  const explicitManifest = readExplicitManifestUrl();

  const publicDir = path.join(root, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  /** Манифест для сайта: относительные URL — приложение разрешает их относительно manifestUrl. */
  const appUpdate = {
    version,
    setupUrl: "/downloads/trassa-setup.exe",
    releaseNotes: "",
  };
  fs.writeFileSync(
    path.join(publicDir, "app-update.json"),
    JSON.stringify(appUpdate, null, 2) + "\n",
    "utf8"
  );
  console.log("[apply-release-config] public/app-update.json ← version", version);

  const updateDefaults = {
    startupDelayMs: 12000,
    checkIntervalHours: 24,
    remindLaterDays: 7,
  };
  const updatePath = path.join(root, "electron-assets", "update.json");
  let prev = {};
  try {
    if (fs.existsSync(updatePath)) {
      prev = JSON.parse(fs.readFileSync(updatePath, "utf8"));
    }
  } catch {
    /* ignore */
  }

  const manifestUrl =
    explicitManifest ||
    (base && (base.startsWith("https://") || base.startsWith("http://"))
      ? `${base.replace(/\/+$/, "")}/app-update.json`
      : "");

  if (!manifestUrl) {
    const next = { ...updateDefaults, ...prev, manifestUrl: "" };
    fs.writeFileSync(updatePath, JSON.stringify(next, null, 2) + "\n", "utf8");
    console.warn(
      "[apply-release-config] Задайте TRASSA_PUBLIC_URL, release-config.json → publicBaseUrl или manifestUrl — иначе автообновление в приложении выключено. public/app-update.json всё равно сгенерирован."
    );
    return;
  }

  if (!manifestUrl.startsWith("https://")) {
    console.warn(
      "[apply-release-config] Для автообновления нужен https://. Сейчас manifestUrl:",
      manifestUrl
    );
  }

  const next = {
    ...updateDefaults,
    ...prev,
    manifestUrl,
  };
  fs.writeFileSync(updatePath, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log("[apply-release-config] electron-assets/update.json manifestUrl ←", manifestUrl);
}

main();
