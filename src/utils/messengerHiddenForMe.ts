/** Сообщения, скрытые только у текущего пользователя (данные в trassa-messenger-v1 остаются). */

const HIDDEN_FOR_ME_KEY = "trassa-messenger-hidden-for-me-v1";

export function loadHiddenForMeMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(HIDDEN_FOR_ME_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, string[]>;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export function saveHiddenForMeMap(data: Record<string, string[]>) {
  try {
    localStorage.setItem(HIDDEN_FOR_ME_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function isMessengerHiddenForMe(threadId: string, messageId: string): boolean {
  const arr = loadHiddenForMeMap()[threadId];
  return Array.isArray(arr) && arr.includes(messageId);
}

export function addMessengerHiddenForMe(threadId: string, messageId: string): void {
  const data = loadHiddenForMeMap();
  const prev = data[threadId] ?? [];
  if (prev.includes(messageId)) return;
  data[threadId] = [...prev, messageId];
  saveHiddenForMeMap(data);
}

export function clearMessengerHiddenForThread(threadId: string): void {
  const data = loadHiddenForMeMap();
  if (!(threadId in data)) return;
  const { [threadId]: _, ...rest } = data;
  saveHiddenForMeMap(rest);
}

export function removeMessengerHiddenIds(threadId: string, messageIds: Set<string>): void {
  const data = loadHiddenForMeMap();
  const arr = data[threadId];
  if (!Array.isArray(arr) || arr.length === 0) return;
  const next = arr.filter((id) => !messageIds.has(id));
  if (next.length === 0) {
    const { [threadId]: _, ...rest } = data;
    saveHiddenForMeMap(rest);
  } else {
    data[threadId] = next;
    saveHiddenForMeMap(data);
  }
}
