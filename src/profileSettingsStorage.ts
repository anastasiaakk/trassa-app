export const PROFILE_SETTINGS_KEY = "trassa-profile-settings-v1";
export const CABINET_THEME_KEY = "trassa-cabinet-theme";

export type ProfileSettingsData = {
  firstName: string;
  lastName: string;
  roleLabel: string;
  /** Стабильный id для мессенджера (разные аккаунты / кабинеты — разные uid в переписке) */
  messengerUid: string;
  /** Наименование организации — на главной кабинета подрядчика (page4) */
  contractorCompanyName: string;
  email: string;
  phone: string;
  notifyEmail: boolean;
  notifyPush: boolean;
};

const defaults: ProfileSettingsData = {
  firstName: "Александр",
  lastName: "",
  roleLabel: "Организатор",
  messengerUid: "",
  contractorCompanyName: "",
  email: "",
  phone: "",
  notifyEmail: true,
  notifyPush: false,
};

export function loadProfileSettings(): ProfileSettingsData {
  try {
    const raw = localStorage.getItem(PROFILE_SETTINGS_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveProfileSettings(data: ProfileSettingsData) {
  localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(data));
}

export type CabinetTheme = "light" | "dark";

export function loadCabinetTheme(): CabinetTheme {
  try {
    const s = localStorage.getItem(CABINET_THEME_KEY);
    if (s === "dark" || s === "light") return s;
  } catch {
    /* ignore */
  }
  return "light";
}

export function saveCabinetTheme(theme: CabinetTheme) {
  localStorage.setItem(CABINET_THEME_KEY, theme);
}
