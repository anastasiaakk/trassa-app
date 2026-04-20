/**
 * Оставляет в release/ только установщик «Трасса Setup <version>.exe».
 * Удобно вызвать вручную, если папка разрослась (win-unpacked, yml, blockmap).
 */
const fs = require("fs");
const path = require("path");
const { rmWithRetry, tryUnlinkPayloadAsar } = require("./fs-rm-retry.cjs");

const root = path.join(__dirname, "..");
const releaseRoot = path.join(root, "release");
const pkgVersion = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8")
).version;
const expectedExe = `Трасса Setup ${pkgVersion}.exe`;

if (!fs.existsSync(releaseRoot)) {
  console.log("[prune-release] нет папки release/");
  process.exit(0);
}

for (const f of fs.readdirSync(releaseRoot)) {
  if (f === expectedExe) continue;
  const full = path.join(releaseRoot, f);
  if (f === "win-unpacked") tryUnlinkPayloadAsar(full);
  rmWithRetry(full);
  console.log("[prune-release] удалено:", f);
}
