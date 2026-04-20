/**
 * Приглашение в мессенджер по ссылке внутри портала (#/page5?messengerInvite=… или #/page4?… для подрядчика).
 * Данные кодируются в URL; при открытии ссылки контакт добавляется в локальный список.
 * Общий диалог между двумя пользователями: id потока = makeDmThreadId(uidA, uidB), автор сообщения — messengerUid отправителя.
 */

import { loadProfileSettings, saveProfileSettings, type ProfileSettingsData } from "../profileSettingsStorage";
import { syncCurrentUserProfile } from "./localAuth";

/** Совпадает с Page5MessengerView */
const MESSAGES_KEY = "trassa-messenger-v1";
const PEERS_KEY = "trassa-messenger-peers-v1";

export const MSGR_INVITE_PARAM = "messengerInvite";

export const SESSION_ACTIVE_PEER = "trassa-msgr-invite-active";
export const SESSION_TOAST = "trassa-msgr-invite-toast";

export type MessengerInvitePayload = {
  name: string;
  role: string;
  /** uid приглашающего из профиля — для общего потока с получателем */
  uid?: string;
};

/** Один раз на профиль: стабильный id для идентификации в сообщениях и приглашениях. */
export function ensureMessengerUidInProfile(): string {
  const p = loadProfileSettings();
  const existing = p.messengerUid?.trim();
  if (existing) return existing;
  const uid =
    typeof globalThis.crypto !== "undefined" && globalThis.crypto.randomUUID
      ? globalThis.crypto.randomUUID()
      : `mu-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const next: ProfileSettingsData = { ...p, messengerUid: uid };
  saveProfileSettings(next);
  syncCurrentUserProfile(next);
  return uid;
}

/** Один и тот же id потока у обоих собеседников (общий localStorage). */
export function makeDmThreadId(uidA: string, uidB: string): string {
  const [a, b] = [uidA.trim(), uidB.trim()].sort();
  return `dm-${a}__${b}`;
}

function utf8ToBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUtf8(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeMessengerInvite(p: MessengerInvitePayload): string {
  const name = p.name.trim().slice(0, 120);
  const role = p.role.trim().slice(0, 160);
  const uid = p.uid?.trim().slice(0, 80) ?? "";
  return utf8ToBase64Url(JSON.stringify({ name, role, ...(uid ? { uid } : {}) }));
}

export function decodeMessengerInvite(token: string): MessengerInvitePayload | null {
  try {
    const raw = token.trim();
    if (!raw) return null;
    const json = base64UrlToUtf8(raw);
    const o = JSON.parse(json) as unknown;
    if (!o || typeof o !== "object") return null;
    const name = (o as { name?: unknown }).name;
    const role = (o as { role?: unknown }).role;
    const uidRaw = (o as { uid?: unknown }).uid;
    if (typeof name !== "string" || typeof role !== "string") return null;
    const uid =
      typeof uidRaw === "string" && uidRaw.trim() ? uidRaw.trim().slice(0, 80) : undefined;
    return { name: name.trim().slice(0, 120), role: role.trim().slice(0, 160), uid };
  } catch {
    return null;
  }
}

/**
 * Разбор вставленного текста: полная ссылка из адресной строки, фрагмент с ?messengerInvite=… или сырой токен.
 */
export function parseMessengerInviteFromPastedText(pasted: string): MessengerInvitePayload | null {
  const raw = pasted.trim();
  if (!raw) return null;
  const direct = decodeMessengerInvite(raw);
  if (direct) return direct;
  const m = raw.match(/messengerInvite=([^&\s#'"]+)/i);
  if (m?.[1]) {
    let token = m[1];
    try {
      token = decodeURIComponent(token);
    } catch {
      /* keep */
    }
    return decodeMessengerInvite(token);
  }
  return null;
}

/** Имя и роль из настроек профиля для ссылки-приглашения */
export function getInvitePayloadFromProfile(): MessengerInvitePayload {
  const p = loadProfileSettings();
  const name =
    [p.firstName, p.lastName]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ")
      .trim() || "Участник";
  const role = p.roleLabel.trim() || "Участник";
  const uid = ensureMessengerUidInProfile();
  return { name, role, uid };
}

/**
 * Полная ссылка: hash-router, например https://host/app/#/page5?messengerInvite=TOKEN
 */
export function buildMessengerInviteUrl(cabinetPath: string, token: string): string {
  const path = cabinetPath.startsWith("/") ? cabinetPath : `/${cabinetPath}`;
  const { origin, pathname } = window.location;
  const basePath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const q = new URLSearchParams({ [MSGR_INVITE_PARAM]: token });
  return `${origin}${basePath}#${path}?${q.toString()}`;
}

type Peer = { id: string; name: string; role: string };

/** Как в Page5MessengerView.loadPeers — чтобы приглашение не затирало демо-контакты */
const DEFAULT_PEERS: Peer[] = [
  { id: "p1", name: "Елена Козлова", role: "Координатор ТОУАД" },
  { id: "p2", name: "Дмитрий Волков", role: "Представитель подрядчика" },
  { id: "p3", name: "Анна Михайлова", role: "Студенческий клуб РАДОР" },
  { id: "p4", name: "Сергей Никифоров", role: "Куратор документооборота" },
];

function loadPeersForInvite(): Peer[] {
  try {
    const raw = localStorage.getItem(PEERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as Peer[];
      if (Array.isArray(arr) && arr.length > 0) return arr.map((p) => ({ ...p }));
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PEERS.map((p) => ({ ...p }));
}

/**
 * Добавляет собеседника из приглашения в localStorage. Вызывать до монтирования мессенджера
 * (или с key remount), чтобы список подтянулся из хранилища.
 */
export function applyMessengerInvitePayload(payload: MessengerInvitePayload): {
  peerId: string;
  added: boolean;
} {
  const name = payload.name.trim() || "Участник";
  const role = payload.role.trim() || "Участник";
  const remoteUid = payload.uid?.trim();
  const localUid = ensureMessengerUidInProfile();

  const peers = loadPeersForInvite();

  if (remoteUid) {
    const id = makeDmThreadId(localUid, remoteUid);
    const dup = peers.find((p) => p.id === id);
    if (dup) {
      try {
        sessionStorage.setItem(SESSION_ACTIVE_PEER, dup.id);
        sessionStorage.setItem(SESSION_TOAST, JSON.stringify({ mode: "exists" as const, name: dup.name }));
      } catch {
        /* ignore */
      }
      return { peerId: dup.id, added: false };
    }
    const nextPeers = [...peers, { id, name, role }];
    try {
      localStorage.setItem(PEERS_KEY, JSON.stringify(nextPeers));
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem(MESSAGES_KEY);
      const data = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>;
      if (!Array.isArray(data[id])) data[id] = [];
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.setItem(SESSION_ACTIVE_PEER, id);
      sessionStorage.setItem(SESSION_TOAST, JSON.stringify({ mode: "added" as const, name }));
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
    } catch {
      /* ignore */
    }
    return { peerId: id, added: true };
  }

  const dup = peers.find((p) => p.name.trim().toLowerCase() === name.toLowerCase());
  if (dup) {
    try {
      sessionStorage.setItem(SESSION_ACTIVE_PEER, dup.id);
      sessionStorage.setItem(SESSION_TOAST, JSON.stringify({ mode: "exists" as const, name: dup.name }));
    } catch {
      /* ignore */
    }
    return { peerId: dup.id, added: false };
  }

  const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nextPeers = [...peers, { id, name, role }];
  try {
    localStorage.setItem(PEERS_KEY, JSON.stringify(nextPeers));
  } catch {
    /* ignore */
  }

  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    const data = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>;
    if (!Array.isArray(data[id])) data[id] = [];
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }

  try {
    sessionStorage.setItem(SESSION_ACTIVE_PEER, id);
    sessionStorage.setItem(SESSION_TOAST, JSON.stringify({ mode: "added" as const, name }));
  } catch {
    /* ignore */
  }

  try {
    window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
  } catch {
    /* ignore */
  }

  return { peerId: id, added: true };
}
