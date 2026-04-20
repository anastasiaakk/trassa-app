/**
 * Предзагрузка изображений через link rel=preload (без изменения вёрстки).
 */

export function injectImagePreloads(hrefs: readonly string[]): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }
  const links: HTMLLinkElement[] = [];
  for (const href of hrefs) {
    if (!href) continue;
    const l = document.createElement("link");
    l.rel = "preload";
    l.as = "image";
    l.href = href;
    if (href.startsWith("http")) {
      l.crossOrigin = "anonymous";
    }
    document.head.appendChild(l);
    links.push(l);
  }
  return () => {
    for (const l of links) {
      l.parentNode?.removeChild(l);
    }
  };
}
