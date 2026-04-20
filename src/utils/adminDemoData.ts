import { saveSharedCalendarEvents } from "./sharedCalendarEvents";

const MESSENGER_KEYS = [
  "trassa-messenger-v1",
  "trassa-messenger-peers-v1",
  "trassa-messenger-hidden-for-me-v1",
] as const;

/** Очистить демо-данные мессенджера в localStorage. */
export function resetMessengerLocalData(): void {
  MESSENGER_KEYS.forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
}

/** Очистить общий календарь мероприятий (РАДОР/АДО). */
export function clearSharedCalendarEvents(): void {
  saveSharedCalendarEvents([]);
}
