/**
 * Режим технических работ: блокирует приложение для обычных пользователей.
 * Страница /services всегда доступна (вход администратора и карта).
 */

const KEY = "trassa-maintenance-v1";

export type MaintenanceState = {
  active: boolean;
  message: string;
};

const DEFAULT_MESSAGE =
  "Ведутся технические работы. Приносим извинения за неудобства. Попробуйте позже.";

export function loadMaintenanceState(): MaintenanceState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { active: false, message: DEFAULT_MESSAGE };
    const parsed = JSON.parse(raw) as Partial<MaintenanceState>;
    return {
      active: Boolean(parsed.active),
      message:
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
          : DEFAULT_MESSAGE,
    };
  } catch {
    return { active: false, message: DEFAULT_MESSAGE };
  }
}

export function saveMaintenanceState(state: MaintenanceState): void {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      active: state.active,
      message: state.message.trim() || DEFAULT_MESSAGE,
    })
  );
  window.dispatchEvent(new CustomEvent("trassa-maintenance-changed"));
}
