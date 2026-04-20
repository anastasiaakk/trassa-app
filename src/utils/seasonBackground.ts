/**
 * Фоновая анимация по сезону (настраивается в панели администратора).
 */

const KEY = "trassa-season-bg-v1";

export type SeasonMode = "off" | "spring" | "summer" | "autumn" | "winter";

export function loadSeasonBackground(): SeasonMode {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "spring";
    const v = JSON.parse(raw) as unknown;
    if (
      v === "off" ||
      v === "spring" ||
      v === "summer" ||
      v === "autumn" ||
      v === "winter"
    ) {
      return v;
    }
    return "spring";
  } catch {
    return "spring";
  }
}

export function saveSeasonBackground(mode: SeasonMode): void {
  localStorage.setItem(KEY, JSON.stringify(mode));
  window.dispatchEvent(new CustomEvent("trassa-season-bg-changed"));
}
