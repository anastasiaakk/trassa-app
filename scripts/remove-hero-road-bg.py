"""
Убирает однотонный тёмный фон у иллюстрации дороги: линии остаются, фон прозрачный.

Исходник: public/page2-hero-road-original.png (копия с CDN, без потерь).
Результат:  public/page2-hero-road.png (RGBA).

Порог по яркости: фон ~L<58, линии ~L>78 (по гистограмме оригинала).

Запуск: python scripts/remove-hero-road-bg.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "page2-hero-road-original.png"
OUT = ROOT / "public" / "page2-hero-road.png"

# Ниже — почти только фон; выше — линии (с антиалиасингом между)
LUMA_BG = 58.0
LUMA_LINE = 78.0


def luma(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing {SRC} — add the source PNG first.")

    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    px = img.load()

    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if (r, g, b) == (0, 0, 0):
                px[x, y] = (0, 0, 0, 0)
                continue

            L = luma(r, g, b)
            if L <= LUMA_BG:
                a = 0
            elif L >= LUMA_LINE:
                a = 255
            else:
                t = (L - LUMA_BG) / (LUMA_LINE - LUMA_BG)
                a = int(max(0, min(255, round(255 * t))))
            px[x, y] = (r, g, b, a)

    img.save(OUT, "PNG", optimize=True)
    print(f"OK: {OUT} ({w}x{h}) luma thresholds {LUMA_BG}-{LUMA_LINE}")


if __name__ == "__main__":
    main()
