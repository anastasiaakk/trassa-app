const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

/** В собранном установщике иконки лежат в resources/electron-assets (extraResources), не рядом с main.cjs. */
function iconPath() {
  const candidates = [];
  if (process.platform === "win32") {
    if (app.isPackaged) {
      candidates.push(path.join(process.resourcesPath, "electron-assets", "icon.ico"));
    }
    candidates.push(path.join(__dirname, "..", "electron-assets", "icon.ico"));
  }
  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, "electron-assets", "icon.png"));
  }
  candidates.push(path.join(__dirname, "..", "electron-assets", "icon.png"));
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

function createWindow() {
  Menu.setApplicationMenu(null);
  const icon = windowIcon();
  const win = new BrowserWindow({
    width: 540,
    height: 620,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    title: "Установка «Трасса»",
    backgroundColor: "#d8dee8",
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const dev = !app.isPackaged;
  if (dev) {
    win.loadURL("http://127.0.0.1:5180/");
  } else {
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

/**
 * Папка с win-unpacked основного приложения.
 * В dev process.resourcesPath указывает на каталог Electron — там нет payload; берём payload-app.
 */
const UNINSTALL_REG_SUBKEY = "TrassaApp";

function readInstalledAppVersion(installDir) {
  const candidates = [
    path.join(installDir, "resources", "app", "package.json"),
    path.join(installDir, "package.json"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const v = JSON.parse(fs.readFileSync(p, "utf8")).version;
        if (typeof v === "string" && v.length > 0) return v;
      }
    } catch {
      /* ignore */
    }
  }
  return "0.1.0";
}

/**
 * Запись в HKCU\...\Uninstall — приложение видно в «Параметры → Приложения» и «Программы и компоненты».
 */
function registerWindowsUninstallEntry(installDir, exePath) {
  if (process.platform !== "win32") return;
  const version = readInstalledAppVersion(installDir);
  const installDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const dirLit = installDir.replace(/'/g, "''");
  const regUninstallPs =
    `Remove-Item -LiteralPath '${dirLit}' -Recurse -Force -ErrorAction SilentlyContinue; ` +
    `Remove-Item -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${UNINSTALL_REG_SUBKEY}' -Recurse -Force -ErrorAction SilentlyContinue`;
  const encoded = Buffer.from(regUninstallPs, "utf16le").toString("base64");
  const uninstallString =
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand ${encoded}`;
  const verLit = version.replace(/'/g, "''");
  const iconLit = `${exePath},0`.replace(/'/g, "''");
  const ps1 = path.join(app.getPath("temp"), `trassa-register-${Date.now()}.ps1`);
  const script = `
$k = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${UNINSTALL_REG_SUBKEY}'
New-Item -Path $k -Force | Out-Null
Set-ItemProperty -Path $k -Name 'DisplayName' -Value 'Трасса' -Type String
Set-ItemProperty -Path $k -Name 'DisplayVersion' -Value '${verLit}' -Type String
Set-ItemProperty -Path $k -Name 'Publisher' -Value 'Трасса' -Type String
Set-ItemProperty -Path $k -Name 'InstallLocation' -Value '${dirLit}' -Type String
Set-ItemProperty -Path $k -Name 'InstallDate' -Value '${installDate}' -Type String
Set-ItemProperty -Path $k -Name 'DisplayIcon' -Value '${iconLit}' -Type String
Set-ItemProperty -Path $k -Name 'UninstallString' -Value '${uninstallString.replace(/'/g, "''")}' -Type String
Set-ItemProperty -Path $k -Name 'QuietUninstallString' -Value '${uninstallString.replace(/'/g, "''")}' -Type String
Set-ItemProperty -Path $k -Name 'NoModify' -Value 1 -Type DWord
Set-ItemProperty -Path $k -Name 'NoRepair' -Value 1 -Type DWord
`;
  try {
    fs.writeFileSync(ps1, "\uFEFF" + script, "utf8");
    execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1], {
      windowsHide: true,
    });
  } catch (e) {
    console.error("[setup] registerWindowsUninstallEntry:", e.message || e);
  } finally {
    try {
      fs.unlinkSync(ps1);
    } catch {
      /* ignore */
    }
  }
}

function findPayloadDir() {
  const candidates = [];
  if (!app.isPackaged) {
    candidates.push(path.join(__dirname, "payload-app"));
  }
  candidates.push(path.join(process.resourcesPath, "payload"));
  candidates.push(path.join(path.dirname(process.execPath), "resources", "payload"));
  if (app.isPackaged) {
    candidates.push(path.join(path.dirname(__dirname), "payload"));
  }
  for (const dir of candidates) {
    if (!dir) continue;
    try {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
      const files = fs.readdirSync(dir);
      const hasExe = files.some((f) => f.endsWith(".exe"));
      if (hasExe) return dir;
    } catch {
      /* try next */
    }
  }
  return null;
}

ipcMain.handle("default-path", () => {
  const base = process.env.LOCALAPPDATA || path.join(require("os").homedir(), "AppData", "Local");
  return path.join(base, "Трасса");
});

ipcMain.handle("pick-folder", async () => {
  const r = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return r.filePaths[0];
});

ipcMain.handle("install", async (_e, destPath) => {
  const payload = findPayloadDir();
  if (!payload) {
    return {
      ok: false,
      error:
        "Не найден пакет приложения. Пересоберите установщик из корня проекта: npm run electron:build " +
        "(нужен шаг копирования packaged-app → setup-wizard/payload-app).",
    };
  }
  try {
    fs.mkdirSync(destPath, { recursive: true });
    fs.cpSync(payload, destPath, { recursive: true, force: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
  const exePath = path.join(destPath, "Трасса.exe");
  if (!fs.existsSync(exePath)) {
    return { ok: false, error: "Файл Трасса.exe не найден после копирования." };
  }
  try {
    createDesktopShortcut(exePath, destPath);
  } catch {
    /* ярлык не обязателен */
  }
  try {
    registerWindowsUninstallEntry(destPath, exePath);
  } catch {
    /* запись в реестр не обязательна для копирования файлов */
  }
  return { ok: true, exePath };
});

function createDesktopShortcut(exePath, workingDir) {
  const ps1 = path.join(app.getPath("temp"), `trassa-lnk-${Date.now()}.ps1`);
  const desktop = path.join(require("os").homedir(), "Desktop");
  const lnk = path.join(desktop, "Трасса.lnk");
  const script = `
$w = New-Object -ComObject WScript.Shell
$s = $w.CreateShortcut(${JSON.stringify(lnk)})
$s.TargetPath = ${JSON.stringify(exePath)}
$s.WorkingDirectory = ${JSON.stringify(workingDir)}
$s.IconLocation = ${JSON.stringify(exePath + ",0")}
$s.Save()
`;
  fs.writeFileSync(ps1, "\uFEFF" + script, "utf8");
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1], {
      windowsHide: true,
    });
  } finally {
    try {
      fs.unlinkSync(ps1);
    } catch {
      /* ignore */
    }
  }
}

ipcMain.handle("open-folder", (_e, dir) => {
  shell.openPath(dir);
});

ipcMain.handle("open-exe", (_e, exe) => {
  shell.openPath(exe);
});

ipcMain.on("app-quit", () => {
  app.quit();
});

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.myapp.trassa.setup");
  }
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
