/**
 * Обрезка devDependencies сервера для упаковки в Electron.
 * На Windows иногда EBUSY на esbuild.exe — тогда пропускаем (в комплект попадёт полный node_modules).
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

try {
  execSync("npm prune --omit=dev --prefix server", {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
} catch {
  console.warn(
    "[server-proddeps] npm prune не выполнен (файл занят?). Продолжаем с полным server/node_modules."
  );
}
