import type { CSSProperties } from "react";
import { publicUrl } from "./utils/publicUrl";

/**
 * Фон страницы 1: растровое изображение + лёгкий градиент поверх для единства с интерфейсом.
 */
export const PAGE1_SURFACE_STYLE: CSSProperties = {
  backgroundColor: "#0f1629",
  backgroundImage: [
    "linear-gradient(135deg, rgba(26, 42, 82, 0.35) 0%, rgba(26, 42, 82, 0.1) 45%, rgba(86, 6, 29, 0.15) 100%)",
    `url(${JSON.stringify(publicUrl("page1-bg.png"))})`,
  ].join(", "),
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "cover, cover",
  minHeight: "100svh",
  width: "100%",
  position: "relative",
  boxSizing: "border-box",
};
