const { app, BrowserWindow, Menu, nativeImage } = require("electron");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

function iconPath() {
  const candidates = [];
  if (process.platform === "win32") {
    if (app.isPackaged) {
      candidates.push(path.join(process.resourcesPath, "app", "electron-assets", "icon.ico"));
    }
    candidates.push(path.join(__dirname, "electron-assets", "icon.ico"));
  }
  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, "app", "electron-assets", "icon.png"));
  }
  candidates.push(path.join(__dirname, "electron-assets", "icon.png"));
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function windowIcon() {
  const p = iconPath();
  if (!p) return undefined;
  try {
    const img = nativeImage.createFromPath(p);
    return img.isEmpty() ? p : img;
  } catch {
    return p;
  }
}

const DEV_PORTS = [5173, 5174, 5175, 5176];

/** Дочерний процесс API (только в установленном приложении) */
let apiChild = null;

function probePort(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      res.resume();
      resolve(port);
    });
    req.on("error", () => reject(new Error("fail")));
    req.setTimeout(1500, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function findFirstOpenDevPort() {
  for (const port of DEV_PORTS) {
    try {
      await probePort(port);
      return port;
    } catch {
      /* try next */
    }
  }
  throw new Error("no port");
}

/** Ждём Vite: Electron часто стартует раньше dev-сервера; пробуем 5173, 5174… */
function waitForDevServerReady(maxWaitMs = 120000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      findFirstOpenDevPort()
        .then((port) => resolve(port))
        .catch(() => {
          if (Date.now() - started > maxWaitMs) {
            reject(
              new Error(
                `Dev server не найден на портах ${DEV_PORTS.join(", ")}. Запустите: npm run dev или Start-Trassa.bat`
              )
            );
            return;
          }
          setTimeout(poll, 500);
        });
    };
    poll();
  });
}

function jwtSecretFile() {
  return path.join(app.getPath("userData"), "jwt-secret.txt");
}

function readOrCreateJwtSecret() {
  const p = jwtSecretFile();
  try {
    if (fs.existsSync(p)) {
      const s = fs.readFileSync(p, "utf8").trim();
      if (s.length >= 32) return s;
    }
  } catch {
    /* ignore */
  }
  const secret = crypto.randomBytes(32).toString("hex");
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, secret, "utf8");
  } catch (e) {
    console.error("[trassa] Не удалось сохранить jwt-secret:", e);
  }
  return secret;
}

function bundledApiScript() {
  return path.join(process.resourcesPath, "trassa-api", "dist", "index.js");
}

function bundledApiRoot() {
  return path.join(process.resourcesPath, "trassa-api");
}

function getNodeMajor() {
  try {
    const r = spawnSync("node", ["-p", "process.versions.node"], {
      encoding: "utf8",
    });
    if (r.status !== 0) return 0;
    const v = String(r.stdout || "").trim().split(".")[0];
    return parseInt(v, 10) || 0;
  } catch {
    return 0;
  }
}

function apiHealthCheck() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:4000/api/health", (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForBundledApi(maxMs = 25000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      apiHealthCheck().then((ok) => {
        if (ok) {
          resolve();
          return;
        }
        if (Date.now() - t0 > maxMs) {
          reject(new Error("API не ответил на http://127.0.0.1:4000/api/health"));
          return;
        }
        setTimeout(tick, 400);
      });
    };
    tick();
  });
}

/**
 * В установщике кладём сервер в resources/trassa-api (см. package.json extraResources).
 * Запускаем через системный Node 22+ (node:sqlite). Если Node нет или версия < 22 — только лог.
 */
async function startBundledApiIfNeeded() {
  if (!app.isPackaged) return;

  const up = await apiHealthCheck();
  if (up) {
    console.log("[trassa] API уже доступен на порту 4000");
    return;
  }

  const script = bundledApiScript();
  if (!fs.existsSync(script)) {
    console.warn(
      "[trassa] В комплекте нет trassa-api. Запустите сервер вручную (Start-Trassa.bat или папка server)."
    );
    return;
  }

  const major = getNodeMajor();
  if (major < 22) {
    console.warn(
      `[trassa] Для автозапуска API нужен Node.js 22+ в PATH (сейчас: ${major || "не найден"}). Установите с nodejs.org или запустите API отдельно.`
    );
    return;
  }

  const apiRoot = bundledApiRoot();
  const jwt = readOrCreateJwtSecret();
  const dataDir = path.join(app.getPath("userData"), "api-data");

  try {
    apiChild = spawn("node", [script], {
      cwd: apiRoot,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: "4000",
        JWT_SECRET: jwt,
        TRASSA_DATA_DIR: dataDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    console.error("[trassa] Не удалось запустить API:", e);
    return;
  }

  apiChild.stdout?.on("data", (d) => console.log(`[trassa-api] ${d}`));
  apiChild.stderr?.on("data", (d) => console.error(`[trassa-api] ${d}`));
  apiChild.on("error", (err) => console.error("[trassa] Ошибка процесса API:", err));
  apiChild.on("exit", (code, signal) => {
    if (code != null && code !== 0) {
      console.warn(`[trassa] API завершился с кодом ${code}`);
    }
    if (signal) console.warn(`[trassa] API завершён сигналом ${signal}`);
    apiChild = null;
  });

  try {
    await waitForBundledApi();
    console.log("[trassa] Встроенный API готов");
  } catch (e) {
    console.error("[trassa]", e.message);
    if (apiChild && !apiChild.killed) {
      apiChild.kill();
      apiChild = null;
    }
  }
}

function setApplicationMenuForPlatform() {
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: "Трасса",
          submenu: [
            { role: "about", label: "О программе" },
            { type: "separator" },
            { role: "quit", label: "Выход" },
          ],
        },
        {
          label: "Правка",
          submenu: [
            { role: "undo", label: "Отменить" },
            { role: "redo", label: "Повторить" },
            { type: "separator" },
            { role: "cut", label: "Вырезать" },
            { role: "copy", label: "Копировать" },
            { role: "paste", label: "Вставить" },
            { role: "selectAll", label: "Выделить всё" },
          ],
        },
      ])
    );
    return;
  }
  /* Windows/Linux: убираем стандартное меню File / Edit / View / … (английские «вкладки») */
  Menu.setApplicationMenu(null);
}

function createWindow() {
  const icon = windowIcon();
  const win = new BrowserWindow({
    title: "Трасса",
    width: 1280,
    height: 800,
    backgroundColor: "#151a24",
    show: false,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      /** Иначе Chromium снижает частоту таймеров/кадров в фоне — страдают CSS/JS-анимации. */
      backgroundThrottling: false,
    },
  });

  /** Заголовок окна — «Трасса» (страница может подставить другое из &lt;title&gt;) */
  const fixTitle = () => win.setTitle("Трасса");
  win.on("page-title-updated", (e) => {
    e.preventDefault();
    fixTitle();
  });
  win.webContents.on("did-finish-load", fixTitle);

  win.once("ready-to-show", () => {
    if (app.isPackaged) {
      win.maximize();
    }
    win.show();
  });

  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

  if (isDev) {
    waitForDevServerReady()
      .then((port) => {
        win.loadURL(`http://127.0.0.1:${port}/#/`);
        win.webContents.openDevTools();
      })
      .catch((err) => {
        console.error(err.message);
        win.loadURL(`http://127.0.0.1:5173/#/`);
        win.webContents.openDevTools();
      });
  } else {
    const indexHtml = path.join(__dirname, "dist", "index.html");
    win.loadFile(indexHtml, { hash: "/" });
  }

  return win;
}

app.whenReady().then(async () => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.myapp.id");
  }
  setApplicationMenuForPlatform();
  await startBundledApiIfNeeded();
  const mainWindow = createWindow();
  if (app.isPackaged) {
    try {
      const { scheduleUpdateCheck } = require("./electron-update-check.cjs");
      scheduleUpdateCheck(mainWindow);
    } catch (e) {
      console.warn("[trassa] update check:", e.message);
    }
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  if (apiChild && !apiChild.killed) {
    try {
      apiChild.kill();
    } catch {
      /* ignore */
    }
    apiChild = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
