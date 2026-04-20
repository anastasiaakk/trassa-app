/**
 * Проверка обновлений для кастомного установщика (не NSIS auto-updater):
 * HTTPS JSON-манифест + ссылка на новый Трасса Setup … .exe
 * См. deploy/app-update-manifest.example.json и DESKTOP.md
 */
const fs = require("fs");
const path = require("path");
const { app, dialog, shell } = require("electron");

function compareVersion(remote, current) {
  const pa = String(remote)
    .split(".")
    .map((x) => parseInt(x, 10) || 0);
  const pb = String(current)
    .split(".")
    .map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const a = pa[i] || 0;
    const b = pb[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

function loadUpdateConfig() {
  const p = path.join(__dirname, "electron-assets", "update.json");
  try {
    if (!fs.existsSync(p)) return null;
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!j || typeof j.manifestUrl !== "string") return null;
    return j;
  } catch {
    return null;
  }
}

function statePath() {
  return path.join(app.getPath("userData"), "update-check-state.json");
}

function loadState() {
  try {
    const p = statePath();
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

function saveState(next) {
  try {
    fs.writeFileSync(statePath(), JSON.stringify(next, null, 0), "utf8");
  } catch (e) {
    console.warn("[update-check] save state:", e.message);
  }
}

async function fetchManifest(url) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Абсолютный https или относительный путь от манифеста (например /downloads/…).
 * @param {string} raw
 * @param {string} manifestUrl
 */
function resolveSetupUrl(raw, manifestUrl) {
  const s = String(raw).trim();
  if (!s) return "";
  if (s.startsWith("https://")) return s;
  try {
    const base = new URL(manifestUrl);
    if (s.startsWith("/")) {
      return new URL(s, `${base.origin}/`).href;
    }
    return new URL(s, manifestUrl).href;
  } catch {
    return "";
  }
}

function safeParent(win) {
  if (!win || win.isDestroyed()) return undefined;
  return win;
}

/**
 * @param {import("electron").BrowserWindow | null | undefined} mainWindow
 */
function scheduleUpdateCheck(mainWindow) {
  const cfg = loadUpdateConfig();
  if (!cfg) return;
  const url = cfg.manifestUrl.trim();
  if (!url || !url.startsWith("https://")) {
    return;
  }

  const delayMs = Math.max(3000, Number(cfg.startupDelayMs) || 12000);
  setTimeout(() => {
    runUpdateCheck(mainWindow, cfg).catch((e) => console.warn("[update-check]", e.message));
  }, delayMs);
}

async function runUpdateCheck(mainWindow, cfg) {
  const manifestUrl = cfg.manifestUrl.trim();
  const intervalMs = Math.max(1, Number(cfg.checkIntervalHours) || 24) * 3600000;
  const remindDays = Math.max(1, Number(cfg.remindLaterDays) || 7);

  const now = Date.now();
  let state = loadState();
  if (state.lastCheckMs && now - state.lastCheckMs < intervalMs) {
    return;
  }

  state = { ...state, lastCheckMs: now };
  saveState(state);

  let manifest;
  try {
    manifest = await fetchManifest(manifestUrl);
  } catch (e) {
    console.warn("[update-check] манифест недоступен:", e.message);
    return;
  }

  const remote = manifest.version;
  const setupUrlRaw = manifest.setupUrl;
  const current = app.getVersion();

  if (typeof remote !== "string" || !remote.trim()) return;
  if (typeof setupUrlRaw !== "string" || !setupUrlRaw.trim()) return;

  const setupUrl = resolveSetupUrl(setupUrlRaw, manifestUrl);
  if (!setupUrl.startsWith("https://")) {
    console.warn("[update-check] setupUrl должен быть https или путь от корня сайта (разрешён из манифеста)");
    return;
  }

  if (compareVersion(remote.trim(), current) <= 0) return;

  state = loadState();
  const postpone = state.postponeUntil && state.postponeUntil[remote];
  if (postpone && now < postpone) return;

  const notes =
    typeof manifest.releaseNotes === "string" && manifest.releaseNotes.trim()
      ? `\n\n${manifest.releaseNotes.trim()}`
      : "";

  const detail = `Текущая версия: ${current}\nДоступна: ${remote}${notes}`;

  const { response } = await dialog.showMessageBox(safeParent(mainWindow), {
    type: "question",
    buttons: ["Обновить", "Позже"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
    title: "Доступно обновление",
    message: `Вышла новая версия приложения (${remote}). Установить обновление?`,
    detail,
  });

  if (response === 0) {
    await shell.openExternal(setupUrl);
    return;
  }

  state = loadState();
  state.postponeUntil = state.postponeUntil || {};
  state.postponeUntil[remote] = now + remindDays * 86400000;
  saveState(state);
}

module.exports = { scheduleUpdateCheck };
