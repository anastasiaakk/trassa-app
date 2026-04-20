/** Сообщает Т-боту о новых входящих в мессенджере: звук + текст (без дубля при первом открытии сессии). */

import { loadProfileSettings } from "../profileSettingsStorage";
import { ensureMessengerUidInProfile } from "./messengerInvite";
import { isMessengerHiddenForMe } from "./messengerHiddenForMe";

const MESSENGER_STORE = "trassa-messenger-v1";
const PEERS_STORE = "trassa-messenger-peers-v1";
export const TBOT_MSGR_ANNOUNCED_IDS_KEY = "trassa-tbot-msgr-announced-ids";

export type IncomingMessengerStub = {
  id: string;
  threadId: string;
  author: string;
  text: string;
};

function parseStore(): Record<string, Array<{ id: string; author: string; text: string; createdAt?: string }>> {
  try {
    const raw = localStorage.getItem(MESSENGER_STORE);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<
      string,
      Array<{ id: string; author: string; text: string; createdAt?: string }>
    >;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function collectAllIncomingMessageIds(): Set<string> {
  const myUid = ensureMessengerUidInProfile();
  const data = parseStore();
  const ids = new Set<string>();
  for (const tid of Object.keys(data)) {
    for (const m of data[tid] ?? []) {
      if (m.author && m.author !== myUid) ids.add(m.id);
    }
  }
  return ids;
}

function loadPeerNames(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const raw = localStorage.getItem(PEERS_STORE);
    if (!raw) return map;
    const arr = JSON.parse(raw) as Array<{ id: string; name: string }>;
    if (!Array.isArray(arr)) return map;
    for (const p of arr) {
      if (p?.id && p?.name) map.set(p.id, p.name);
    }
  } catch {
    /* ignore */
  }
  return map;
}

export function findNewIncomingNotAnnounced(announced: Set<string>): IncomingMessengerStub[] {
  const myUid = ensureMessengerUidInProfile();
  const data = parseStore();
  const out: IncomingMessengerStub[] = [];
  for (const threadId of Object.keys(data)) {
    for (const m of data[threadId] ?? []) {
      if (!m.author || m.author === myUid) continue;
      if (isMessengerHiddenForMe(threadId, m.id)) continue;
      if (announced.has(m.id)) continue;
      out.push({
        id: m.id,
        threadId,
        author: m.author,
        text: (m.text ?? "").trim(),
      });
    }
  }
  return out;
}

export function buildMessengerNotifyText(incoming: IncomingMessengerStub[]): string {
  if (incoming.length === 0) return "";
  const hi = "Бип-буп! ";
  const names = loadPeerNames();
  const labelFor = (x: IncomingMessengerStub) =>
    names.get(x.threadId) ?? names.get(x.author) ?? "Собеседник";
  const uniqueLabels = Array.from(new Set(incoming.map(labelFor)));

  if (uniqueLabels.length === 1) {
    const who = uniqueLabels[0];
    return incoming.length === 1
      ? `${hi}Пришло новое сообщение от ${who} — очень ждёт твоего ответа.`
      : `${hi}Пришли новые сообщения от ${who} — очень ждёт твоего ответа.`;
  }

  if (uniqueLabels.length === 2) {
    return `${hi}Новые сообщения от ${uniqueLabels[0]} и от ${uniqueLabels[1]} — очень ждут твоего ответа.`;
  }

  const head = uniqueLabels.slice(0, 3).join(", ");
  const tail = uniqueLabels.length > 3 ? ` и ещё ${uniqueLabels.length - 3}` : "";
  return `${hi}Новые сообщения от ${head}${tail} — очень ждут твоего ответа.`;
}

/** Короткий двухтоновый сигнал (как уведомление), без внешних файлов. */
export function playMessengerIncomingSound(): void {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const run = () => {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(0.11, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      master.connect(ctx.destination);

      const freqs = [880, 1174.66];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        const t0 = now + i * 0.11;
        g.gain.setValueAtTime(0.45, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
        osc.connect(g);
        g.connect(master);
        osc.start(t0);
        osc.stop(t0 + 0.22);
      });
    };

    if (ctx.state === "suspended") {
      void ctx.resume().then(() => {
        run();
        window.setTimeout(() => ctx.close(), 600);
      });
    } else {
      run();
      window.setTimeout(() => ctx.close(), 600);
    }
  } catch {
    /* ignore — автовоспроизведение может быть запрещено */
  }
}

/** Системное уведомление ОС — только если в профиле включены push-уведомления. */
export function tryOsPushNotify(title: string, body: string): void {
  try {
    if (!loadProfileSettings().notifyPush) return;
    if (typeof Notification === "undefined") return;

    const show = () => {
      if (Notification.permission !== "granted") return;
      try {
        new Notification(title, { body });
      } catch {
        /* ignore */
      }
    };

    if (Notification.permission === "granted") {
      show();
      return;
    }
    if (Notification.permission === "default") {
      void Notification.requestPermission().then((p) => {
        if (p === "granted") show();
      });
    }
  } catch {
    /* ignore */
  }
}

export function loadAnnouncedIdsFromSession(): Set<string> {
  try {
    const raw = sessionStorage.getItem(TBOT_MSGR_ANNOUNCED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveAnnouncedIdsToSession(ids: Set<string>): void {
  try {
    sessionStorage.setItem(TBOT_MSGR_ANNOUNCED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}
