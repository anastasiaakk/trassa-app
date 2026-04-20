/** Только аксессуары (пол и одежда убраны). */
export type TBotAccessory = "none" | "glasses" | "starGlasses" | "headphones" | "crown";

export type TBotAppearance = {
  accessory: TBotAccessory;
};

export const DEFAULT_TBOT_APPEARANCE: TBotAppearance = {
  accessory: "none",
};

const STORAGE_KEY = "trassa-tbot-appearance";

export function loadTBotAppearance(): TBotAppearance {
  if (typeof window === "undefined") return DEFAULT_TBOT_APPEARANCE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TBOT_APPEARANCE;
    const p = JSON.parse(raw) as { accessory?: unknown };
    const a = p.accessory;
    if (a === "glasses" || a === "starGlasses" || a === "headphones" || a === "crown" || a === "none") {
      return { accessory: a };
    }
    /* было «Звезда» у антенны */
    if (a === "star") {
      return { accessory: "starGlasses" };
    }
    /* старые сохранения: bow / прочее → нет */
    return DEFAULT_TBOT_APPEARANCE;
  } catch {
    return DEFAULT_TBOT_APPEARANCE;
  }
}

export function saveTBotAppearance(appearance: TBotAppearance) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    /* ignore */
  }
}
