/**
 * Перед сборкой установщика: в setup-wizard/payload-app должен лежать основной win-unpacked
 * (копируется в scripts/build-neo-setup.cjs). Иначе установщик соберётся без приложения.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const payloadApp = path.join(root, "setup-wizard", "payload-app");
const mainPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const expectedExe = `${mainPkg.build.productName}.exe`;

function findAnyAppExe(dir) {
  if (!fs.existsSync(dir)) return null;
  try {
    const files = fs.readdirSync(dir);
    const exes = files.filter((f) => f.endsWith(".exe"));
    if (exes.includes(expectedExe)) return expectedExe;
    const notSetup = exes.filter((f) => !/setup/i.test(f));
    return notSetup[0] || exes[0] || null;
  } catch {
    return null;
  }
}

const found = findAnyAppExe(payloadApp);
if (!found) {
  console.error(
    "[verify-setup-payload] Нет приложения в setup-wizard/payload-app.\n" +
      "Сначала из корня проекта выполните полную сборку: npm run electron:build\n" +
      "(отдельно «npm run build» в setup-wizard без win-unpacked установщик будет пустым.)"
  );
  process.exit(1);
}

console.log("[verify-setup-payload] OK:", path.join("setup-wizard", "payload-app", found));
