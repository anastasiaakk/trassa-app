/**
 * До React: полная перезагрузка с #/services должна снова запускать сценарий со страницы 1.
 * Раньше sessionStorage «пропускал» редирект — оставалась только страница 2 без сплэша.
 */
export function ensureIntroRoute(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("trassa_intro_done");
    const hash = window.location.hash;
    if (!hash || hash === "#" || hash === "#/") return;
    const path = hash.replace(/^#/, "") || "/";
    if (!path.startsWith("/services")) return;
    window.location.hash = "#/";
  } catch {
    /* ignore */
  }
}
