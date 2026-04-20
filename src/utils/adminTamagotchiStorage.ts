const KEY = "trassa-admin-tamagotchi-v1";

export type TamagotchiV1 = {
  v: 1;
  name: string;
  /** Основной цвет шерсти */
  fur: string;
  /** Пузо / мордочка светлее */
  belly: string;
  /** 0 — очень голоден, 100 — сыт */
  satiety: number;
  /** 0 — грустно, 100 — радостно */
  happiness: number;
  /** Фиксированная позиция на экране (px) */
  pos: { left: number; top: number };
  /** Автопрогулка как у Shimeji */
  walk: boolean;
  lastTick: number;
};

export type TamagotchiMsg = { role: "user" | "ai"; text: string; ts: number };

const MAX_MSG = 40;

const defaults = (): TamagotchiV1 => ({
  v: 1,
  name: "Мурзик",
  fur: "#c4a574",
  belly: "#f0e4d4",
  satiety: 85,
  happiness: 80,
  pos: { left: 24, top: 120 },
  walk: true,
  lastTick: Date.now(),
});

export function loadTamagotchi(): TamagotchiV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const p = JSON.parse(raw) as Partial<TamagotchiV1>;
    const d = defaults();
    if (p.v !== 1) return d;
    return {
      ...d,
      name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 32) : d.name,
      fur: typeof p.fur === "string" && /^#[0-9a-fA-F]{6}$/.test(p.fur) ? p.fur : d.fur,
      belly: typeof p.belly === "string" && /^#[0-9a-fA-F]{6}$/.test(p.belly) ? p.belly : d.belly,
      satiety: clampNum(p.satiety, 0, 100, d.satiety),
      happiness: clampNum(p.happiness, 0, 100, d.happiness),
      pos:
        typeof p.pos?.left === "number" && typeof p.pos?.top === "number"
          ? { left: p.pos.left, top: p.pos.top }
          : d.pos,
      walk: typeof p.walk === "boolean" ? p.walk : d.walk,
      lastTick: typeof p.lastTick === "number" ? p.lastTick : d.lastTick,
    };
  } catch {
    return defaults();
  }
}

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function saveTamagotchi(s: TamagotchiV1): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const MSG_KEY = "trassa-admin-tamagotchi-msgs-v1";

export function loadTamagotchiMessages(): TamagotchiMsg[] {
  try {
    const raw = localStorage.getItem(MSG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (m): m is TamagotchiMsg =>
          m != null &&
          typeof m === "object" &&
          (m as TamagotchiMsg).role !== undefined &&
          typeof (m as TamagotchiMsg).text === "string"
      )
      .slice(-MAX_MSG);
  } catch {
    return [];
  }
}

export function saveTamagotchiMessages(messages: TamagotchiMsg[]): void {
  try {
    localStorage.setItem(MSG_KEY, JSON.stringify(messages.slice(-MAX_MSG)));
  } catch {
    /* ignore */
  }
}

/** Постепенный голод и скука (вызывать раз в минуту при открытой панели админа) */
export function applyTimeDecay(state: TamagotchiV1, now: number): TamagotchiV1 {
  const elapsedMin = Math.min(120, Math.max(0, (now - state.lastTick) / 60_000));
  if (elapsedMin < 0.25) return { ...state, lastTick: now };
  let satiety = state.satiety - elapsedMin * 0.8;
  let happiness = state.happiness;
  if (satiety < 35) happiness -= elapsedMin * 0.5;
  if (satiety < 20) happiness -= elapsedMin * 0.4;
  satiety = Math.max(0, satiety);
  happiness = Math.min(100, Math.max(0, happiness));
  return { ...state, satiety, happiness, lastTick: now };
}

export function feedPet(state: TamagotchiV1): TamagotchiV1 {
  return {
    ...state,
    satiety: Math.min(100, state.satiety + 38),
    happiness: Math.min(100, state.happiness + 6),
    lastTick: Date.now(),
  };
}

export function petStroke(state: TamagotchiV1): TamagotchiV1 {
  return {
    ...state,
    happiness: Math.min(100, state.happiness + 12),
    lastTick: Date.now(),
  };
}
