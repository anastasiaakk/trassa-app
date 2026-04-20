/** Серверная аутентификация (JWT в httpOnly cookie). Включите `VITE_USE_AUTH_API=true` и прокси /api. */
export function isAuthApiEnabled(): boolean {
  return import.meta.env.VITE_USE_AUTH_API === "true";
}
