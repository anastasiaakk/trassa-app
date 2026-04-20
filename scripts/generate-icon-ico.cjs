/**
 * Делает electron-assets/icon.ico для Windows (.exe). Исходник может быть PNG или JPEG
 * (файл historically назван icon.png).
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const assetPath = path.join(root, "electron-assets", "icon.png");
const icoPath = path.join(root, "electron-assets", "icon.ico");
const tmpSquarePng = path.join(root, "electron-assets", ".icon-square-for-ico.png");

if (!fs.existsSync(assetPath)) {
  console.error("[generate-icon-ico] нет файла:", assetPath);
  process.exit(1);
}

(async () => {
  const img = sharp(assetPath);
  const meta = await img.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("[generate-icon-ico] не удалось прочитать размеры изображения");
  }

  const tmpOut = assetPath + ".tmp.png";
  await sharp(assetPath).png().toFile(tmpOut);
  fs.unlinkSync(assetPath);
  fs.renameSync(tmpOut, assetPath);
  console.log("[generate-icon-ico] icon.png сохранён как корректный PNG");

  await sharp(assetPath)
    .resize(256, 256, { fit: "cover", position: "centre" })
    .png()
    .toFile(tmpSquarePng);

  const { default: pngToIco } = await import("png-to-ico");
  const buf = await pngToIco(tmpSquarePng);
  fs.writeFileSync(icoPath, buf);
  fs.unlinkSync(tmpSquarePng);
  console.log("[generate-icon-ico] записан", icoPath);
})().catch((err) => {
  if (fs.existsSync(tmpSquarePng)) {
    try {
      fs.unlinkSync(tmpSquarePng);
    } catch {
      /* ignore */
    }
  }
  console.error(err);
  process.exit(1);
});
