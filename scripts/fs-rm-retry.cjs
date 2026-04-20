const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

/** Часто мешает удалению win-unpacked (старый asar при смене режима упаковки). */
function tryUnlinkPayloadAsar(winUnpackedDir) {
  const asar = path.join(winUnpackedDir, "resources", "app.asar");
  if (!fs.existsSync(asar)) return;
  try {
    fs.unlinkSync(asar);
    console.log("[rm-retry] удалён resources/app.asar перед снятием блокировки");
  } catch (e) {
    console.warn("[rm-retry] unlink app.asar:", e.code || e.message);
  }
}

/**
 * Удаление дерева с повторами (Windows: EBUSY на app.asar и т.п.).
 */
function rmWithRetry(target, attempts = 6) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        console.warn(
          `[rm-retry] ${path.basename(target)}: попытка ${i + 1}/${attempts}… (${e.code || e.message})`
        );
        sleep(2000);
      }
    }
  }
  if (lastErr && (lastErr.code === "EBUSY" || lastErr.code === "EPERM")) {
    console.error(
      "[rm-retry] Файл занят: закройте Проводник в этой папке и приложения (например «Трасса»), затем повторите."
    );
  }
  throw lastErr;
}

module.exports = { sleep, rmWithRetry, tryUnlinkPayloadAsar };
