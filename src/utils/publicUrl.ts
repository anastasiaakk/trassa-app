/**
 * Файлы из `public/` (после сборки — рядом с index.html).
 * В Electron (`file://`) относительные `./foo` в атрибутах иногда разрешаются неверно;
 * привязка к `document.baseURI` даёт корректный `file:///…/dist/foo.svg`.
 */
export function publicUrl(path: string): string {
  const p = path.replace(/^\/+/, "");
  const raw = import.meta.env.BASE_URL;
  const rel = raw.endsWith("/") ? `${raw}${p}` : `${raw}/${p}`;
  if (typeof document !== "undefined" && document.baseURI) {
    try {
      return new URL(rel, document.baseURI).href;
    } catch {
      /* fallback */
    }
  }
  return rel;
}
