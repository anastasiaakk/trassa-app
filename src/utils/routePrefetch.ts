/**
 * Прогрев динамических чанков до клика — маршруты остаются lazy, но загрузка
 * начинается заранее (кеш модулей Vite/Rollup).
 */

export function prefetchServicesRoute(): void {
  void import("../pages/Page2");
}

export function prefetchRoleSelectRoute(): void {
  void import("../pages/Page3");
}

/** После первого кадра — типичные следующие экраны без блокировки main thread. */
export function scheduleIdlePrefetchCommonRoutes(): void {
  const run = () => {
    prefetchServicesRoute();
    prefetchRoleSelectRoute();
    /** В Electron (file://) чанки грузятся с диска — подгружаем тяжёлые маршруты раньше, чем requestIdleCallback. */
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      void import("../pages/Page5");
      void import("../pages/Page4");
    }
  };
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    globalThis.setTimeout(run, 120);
    return;
  }
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    globalThis.setTimeout(run, 300);
  }
}
