"""Убирает чёрный фон у page2-hero-highway-source.png → page2-hero-highway.png"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "assets" / "page2-hero-highway-source.png"
OUT = ROOT / "src" / "assets" / "page2-hero-highway.png"

# Подобрано по гистограмме: ~90% кадра — почти чёрный, линии выше ~60–70+
LUMA_BG = 32.0
LUMA_LINE = 58.0


def luma(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
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
    print(f"OK {OUT} ({w}x{h})")


if __name__ == "__main__":
    main()
