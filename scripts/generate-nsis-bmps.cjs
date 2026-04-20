/**
 * BMP 24-bit для NSIS: боковая панель 164×314 и шапка 150×57 (неоморфный тёмный стиль).
 * Запуск: node scripts/generate-nsis-bmps.cjs
 */
const fs = require("fs");
const path = require("path");

function clamp(n, a = 0, b = 255) {
  return Math.max(a, Math.min(b, Math.round(n)));
}

function writeBmp24(outPath, width, height, getRgb) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const imageSize = rowSize * height;
  const fileSize = 54 + imageSize;
  const buf = Buffer.alloc(fileSize);

  let o = 0;
  buf.write("BM", o);
  o += 2;
  buf.writeUInt32LE(fileSize, o);
  o += 4;
  buf.writeUInt32LE(0, o);
  o += 4;
  buf.writeUInt32LE(54, o);
  o += 4;
  buf.writeUInt32LE(40, o);
  o += 4;
  buf.writeInt32LE(width, o);
  o += 4;
  buf.writeInt32LE(height, o);
  o += 4;
  buf.writeUInt16LE(1, o);
  o += 2;
  buf.writeUInt16LE(24, o);
  o += 2;
  buf.writeUInt32LE(0, o);
  o += 4;
  buf.writeUInt32LE(imageSize, o);
  o += 4;
  buf.writeInt32LE(0, o);
  o += 4;
  buf.writeInt32LE(0, o);
  o += 4;
  buf.writeUInt32LE(0, o);
  o += 4;
  buf.writeUInt32LE(0, o);
  o += 4;

  let pos = 54;
  for (let by = 0; by < height; by++) {
    const yTop = height - 1 - by;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getRgb(x, yTop);
      const i = pos + x * 3;
      buf[i] = clamp(b);
      buf[i + 1] = clamp(g);
      buf[i + 2] = clamp(r);
    }
    pos += rowSize;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
}

function neoSidebarPixel(x, y, w, h) {
  const nx = x / Math.max(1, w - 1);
  const ny = y / Math.max(1, h - 1);
  let r = 34;
  let g = 42;
  let b = 58;
  const light = Math.exp(-((nx - 0.22) ** 2 + (ny - 0.18) ** 2) * 10) * 38;
  r += light;
  g += light;
  b += light * 0.95;
  const glow = Math.exp(-((nx - 0.12) ** 2 + (ny - 0.55) ** 2) * 18) * 22;
  r += glow * 0.4;
  g += glow * 0.5;
  b += glow * 0.7;
  const shade = Math.exp(-((nx - 0.92) ** 2 + (ny - 0.65) ** 2) * 25) * -28;
  r += shade;
  g += shade;
  b += shade;
  const rim = (1 - nx) * 8;
  r += rim;
  g += rim;
  b += rim;
  return [r, g, b];
}

function neoHeaderPixel(x, y, w, h) {
  const nx = x / Math.max(1, w - 1);
  const ny = y / Math.max(1, h - 1);
  let r = 38 + nx * 12;
  let g = 46 + nx * 10;
  let b = 62 + nx * 14;
  const hi = Math.exp(-((nx - 0.35) ** 2 + (ny - 0.4) ** 2) * 20) * 20;
  r += hi;
  g += hi;
  b += hi;
  const inset = Math.exp(-((nx - 0.85) ** 2) * 40) * -15;
  r += inset;
  g += inset;
  b += inset;
  return [r, g, b];
}

const root = path.join(__dirname, "..");
const dir = path.join(root, "build", "installer");
writeBmp24(path.join(dir, "nsis-sidebar.bmp"), 164, 314, neoSidebarPixel);
writeBmp24(path.join(dir, "nsis-header.bmp"), 150, 57, neoHeaderPixel);
console.log("[generate-nsis-bmps] wrote build/installer/nsis-sidebar.bmp, nsis-header.bmp");
