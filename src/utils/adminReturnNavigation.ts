/**
 * Переходы из быстрых ссылок админ-панели: возможность вернуться на /services в кабинет администратора.
 */

const STORAGE_KEY = "trassa-opened-from-admin-dashboard";

/** Вызвать при клике по быстрой ссылке в AdminDashboard (перед переходом). */
export function markNavigationFromAdminDashboard(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearAdminReturnMark(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldShowReturnToAdminDashboard(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Query для Page2: открыть встроенный кабинет администратора после входа. */
export const ADMIN_CABINET_SEARCH = "adminCabinet=1";
