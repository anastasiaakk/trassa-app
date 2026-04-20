import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getHoverTooltipPreset, HoverTooltip } from "../components/HoverTooltip";
import {
  addMessengerHiddenForMe,
  clearMessengerHiddenForThread,
  loadHiddenForMeMap,
  removeMessengerHiddenIds,
} from "../utils/messengerHiddenForMe";
import {
  applyMessengerInvitePayload,
  ensureMessengerUidInProfile,
  parseMessengerInviteFromPastedText,
  SESSION_ACTIVE_PEER,
  SESSION_TOAST,
  buildMessengerInviteUrl,
  encodeMessengerInvite,
  getInvitePayloadFromProfile,
} from "../utils/messengerInvite";
import type { Page5ThemeStyles } from "./Page5EventsView";

const STORAGE_KEY = "trassa-messenger-v1";
const PEERS_STORAGE_KEY = "trassa-messenger-peers-v1";
const MAX_ATTACH_BYTES = 1_800_000;

export type MessengerPeer = {
  id: string;
  name: string;
  role: string;
};

export type MessengerAttachment = {
  id: string;
  kind: "image" | "file";
  name: string;
  dataUrl?: string;
};

export type MessengerMessage = {
  id: string;
  threadId: string;
  /** messengerUid отправителя (или id демо-собеседника); не использовать литерал "me" в новых сообщениях */
  author: string;
  text: string;
  createdAt: string;
  attachments?: MessengerAttachment[];
};

const DEFAULT_PEERS: MessengerPeer[] = [
  { id: "p1", name: "Елена Козлова", role: "Координатор ТОУАД" },
  { id: "p2", name: "Дмитрий Волков", role: "Представитель подрядчика" },
  { id: "p3", name: "Анна Михайлова", role: "Студенческий клуб РАДОР" },
  { id: "p4", name: "Сергей Никифоров", role: "Куратор документооборота" },
];

function loadPeers(): MessengerPeer[] {
  try {
    const raw = localStorage.getItem(PEERS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as MessengerPeer[];
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PEERS.map((p) => ({ ...p }));
}

function savePeers(peers: MessengerPeer[]) {
  try {
    localStorage.setItem(PEERS_STORAGE_KEY, JSON.stringify(peers));
  } catch {
    /* ignore */
  }
}

function defaultSeedText(peerIndex: number) {
  if (peerIndex === 0) return "Добрый день! Напоминаю: свод по командам нужен до пятницы.";
  if (peerIndex === 1) return "Материалы по объекту отправил в общую папку, посмотрите, пожалуйста.";
  return "Здравствуйте! Готовы подключиться к встрече в четверг в 15:00.";
}

function loadThreadStore(peerIds: string[]): Record<string, MessengerMessage[]> {
  let stored: Record<string, MessengerMessage[]> | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as Record<string, MessengerMessage[]>;
  } catch {
    /* ignore */
  }
  const t0 = Date.now();
  const out: Record<string, MessengerMessage[]> = {};
  peerIds.forEach((id, i) => {
    const existing = stored?.[id];
    if (Array.isArray(existing)) {
      out[id] = existing;
      return;
    }
    const def = DEFAULT_PEERS.find((p) => p.id === id);
    if (def) {
      const idx = DEFAULT_PEERS.findIndex((p) => p.id === id);
      out[id] = [
        {
          id: `seed-${id}-1`,
          threadId: id,
          author: id,
          text: defaultSeedText(idx),
          createdAt: new Date(t0 - (idx + 1) * 3600000).toISOString(),
        },
      ];
    } else {
      out[id] = [];
    }
  });
  return out;
}

function saveMessages(data: Record<string, MessengerMessage[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

type Props = {
  styles: Page5ThemeStyles;
  isDark: boolean;
  /** Маршрут кабинета для ссылки-приглашения, например /page5 или /page6 */
  cabinetPath?: string;
};

function readInviteToastOnce(): { mode: "added" | "exists"; name: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_TOAST);
    if (raw) sessionStorage.removeItem(SESSION_TOAST);
    if (!raw) return null;
    const o = JSON.parse(raw) as { mode?: string; name?: string };
    if (o.mode === "added" && typeof o.name === "string") return { mode: "added", name: o.name };
    if (o.mode === "exists" && typeof o.name === "string") return { mode: "exists", name: o.name };
    return null;
  } catch {
    return null;
  }
}

function useNarrowMessenger(breakpoint = 760) {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return narrow;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

/** Синхронное чтение списка и потоков после applyMessengerInvitePayload (снимает SESSION_ACTIVE_PEER). */
function readMessengerStateFromStorage(): {
  peers: MessengerPeer[];
  byThread: Record<string, MessengerMessage[]>;
  activeId: string;
} {
  const peers = loadPeers();
  const byThread = loadThreadStore(peers.map((p) => p.id));
  let forced: string | null = null;
  try {
    forced = sessionStorage.getItem(SESSION_ACTIVE_PEER);
    if (forced) sessionStorage.removeItem(SESSION_ACTIVE_PEER);
  } catch {
    /* ignore */
  }
  const activeId =
    forced && peers.some((p) => p.id === forced) ? forced : peers[0]?.id ?? "p1";
  return { peers, byThread, activeId };
}

/** Один проход: localStorage + потоки + активный диалог (раньше loadPeers вызывался до 4 раз при монтировании). */
function computeInitialMessengerState(): ReturnType<typeof readMessengerStateFromStorage> {
  return readMessengerStateFromStorage();
}

export const Page5MessengerView = memo(function Page5MessengerView({ styles, isDark, cabinetPath }: Props) {
  const narrow = useNarrowMessenger();
  const tooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  const initialMessengerRef = useRef<ReturnType<typeof computeInitialMessengerState> | null>(null);
  const getInitialMessenger = () => {
    if (!initialMessengerRef.current) initialMessengerRef.current = computeInitialMessengerState();
    return initialMessengerRef.current;
  };

  const [peers, setPeers] = useState(() => getInitialMessenger().peers);
  const [byThread, setByThread] = useState(() => getInitialMessenger().byThread);
  const [activeId, setActiveId] = useState(() => getInitialMessenger().activeId);
  const [inviteToast, setInviteToast] = useState<{ mode: "added" | "exists"; name: string } | null>(() =>
    readInviteToastOnce()
  );
  const [inviteCopied, setInviteCopied] = useState(false);
  const [invitePasteField, setInvitePasteField] = useState("");
  const [invitePasteError, setInvitePasteError] = useState<string | null>(null);
  const [invitePasteApplied, setInvitePasteApplied] = useState(false);
  const [myAuthorId] = useState(() => ensureMessengerUidInProfile());
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [peerSettingsOpen, setPeerSettingsOpen] = useState(false);
  const inviteUrl = useMemo(() => {
    const path = cabinetPath ?? "/page5";
    const payload = getInvitePayloadFromProfile();
    return buildMessengerInviteUrl(path, encodeMessengerInvite(payload));
  }, [cabinetPath, peerSettingsOpen]);
  const copyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2200);
    } catch {
      /* ignore */
    }
  }, [inviteUrl]);

  const applyPastedFriendInvite = useCallback(() => {
    setInvitePasteError(null);
    const payload = parseMessengerInviteFromPastedText(invitePasteField);
    if (!payload) {
      setInvitePasteError(
        "Не удалось распознать приглашение. Вставьте полную ссылку со страницы или фрагмент с messengerInvite=…"
      );
      return;
    }
    applyMessengerInvitePayload(payload);
    const next = readMessengerStateFromStorage();
    setPeers(next.peers);
    setByThread(next.byThread);
    setActiveId(next.activeId);
    const toast = readInviteToastOnce();
    if (toast) setInviteToast(toast);
    setInvitePasteField("");
    setInvitePasteApplied(true);
    window.setTimeout(() => setInvitePasteApplied(false), 2200);
  }, [invitePasteField]);
  const [pendingAttachments, setPendingAttachments] = useState<MessengerAttachment[]>([]);
  const [hiddenForMe, setHiddenForMe] = useState<Record<string, string[]>>(() => loadHiddenForMeMap());
  const [msgMenuId, setMsgMenuId] = useState<string | null>(null);
  const [forwardPickMsg, setForwardPickMsg] = useState<MessengerMessage | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    savePeers(peers);
  }, [peers]);

  useEffect(() => {
    saveMessages(byThread);
    try {
      window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
    } catch {
      /* ignore */
    }
  }, [byThread]);

  const activePeer = useMemo(() => peers.find((p) => p.id === activeId) ?? peers[0], [activeId, peers]);

  const messages = byThread[activeId] ?? [];

  const visibleMessages = useMemo(() => {
    const hide = new Set(hiddenForMe[activeId] ?? []);
    return messages.filter((m) => !hide.has(m.id));
  }, [messages, activeId, hiddenForMe]);

  const hideMessageForMe = useCallback((threadId: string, messageId: string) => {
    addMessengerHiddenForMe(threadId, messageId);
    setHiddenForMe(loadHiddenForMeMap());
    try {
      window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
    } catch {
      /* ignore */
    }
  }, []);

  const deleteMessageForEveryone = useCallback((threadId: string, messageId: string) => {
    setByThread((prev) => ({
      ...prev,
      [threadId]: (prev[threadId] ?? []).filter((m) => m.id !== messageId),
    }));
    removeMessengerHiddenIds(threadId, new Set([messageId]));
    setHiddenForMe(loadHiddenForMeMap());
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  }, []);

  const onBubblePointerDown = useCallback(
    (e: React.PointerEvent, m: MessengerMessage) => {
      if (e.button !== 0) return;
      cancelLongPress();
      longPressStartRef.current = { x: e.clientX, y: e.clientY };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        longPressStartRef.current = null;
        setMsgMenuId(m.id);
        try {
          navigator.vibrate?.(35);
        } catch {
          /* ignore */
        }
      }, 520);
    },
    [cancelLongPress]
  );

  const onBubblePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (longPressTimerRef.current == null || !longPressStartRef.current) return;
      const s = longPressStartRef.current;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (dx * dx + dy * dy > 100) cancelLongPress();
    },
    [cancelLongPress]
  );

  const onBubblePointerEnd = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  const copyMessageToClipboard = useCallback(async (m: MessengerMessage) => {
    const lines: string[] = [];
    if (m.text?.trim()) lines.push(m.text.trim());
    if (m.attachments?.length) {
      for (const a of m.attachments) {
        lines.push(a.kind === "image" ? `[Фото: ${a.name}]` : `[Файл: ${a.name}]`);
      }
    }
    const str = lines.join("\n");
    try {
      await navigator.clipboard.writeText(str.length ? str : " ");
    } catch {
      /* ignore */
    }
    setMsgMenuId(null);
  }, []);

  const confirmForwardToPeer = useCallback((m: MessengerMessage, targetThreadId: string) => {
    const textOut = m.text?.trim()
      ? `↪ ${m.text.trim()}`
      : m.attachments?.length
        ? "↪ [Вложение]"
        : "↪";
    const attachments = m.attachments?.map((a, i) => ({
      ...a,
      id: `fw-a-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    }));
    const newMsg: MessengerMessage = {
      id: `fw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      threadId: targetThreadId,
      author: myAuthorId,
      text: textOut,
      createdAt: new Date().toISOString(),
      attachments: attachments?.length ? attachments : undefined,
    };
    setByThread((prev) => ({
      ...prev,
      [targetThreadId]: [...(prev[targetThreadId] ?? []), newMsg],
    }));
    setForwardPickMsg(null);
    setMsgMenuId(null);
  }, [myAuthorId]);

  useEffect(() => {
    if (msgMenuId == null) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-messenger-msg-menu-root]")) return;
      setMsgMenuId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [msgMenuId]);

  useEffect(() => {
    if (msgMenuId == null && forwardPickMsg == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMsgMenuId(null);
        setForwardPickMsg(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [msgMenuId, forwardPickMsg]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, visibleMessages.length]);

  useEffect(() => {
    if (!peerSettingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPeerSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [peerSettingsOpen]);

  useEffect(() => {
    if (!inviteToast) return;
    const id = window.setTimeout(() => setInviteToast(null), 6000);
    return () => window.clearTimeout(id);
  }, [inviteToast]);

  const addPeer = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const role = newRole.trim() || "Участник";
    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const peer: MessengerPeer = { id, name, role };
    setPeers((prev) => [...prev, peer]);
    setByThread((prev) => ({ ...prev, [id]: [] }));
    setNewName("");
    setNewRole("");
    setActiveId(id);
  }, [newName, newRole]);

  const removePeer = useCallback((id: string) => {
    clearMessengerHiddenForThread(id);
    setHiddenForMe(loadHiddenForMeMap());
    setPeers((prev) => {
      const next = prev.filter((p) => p.id !== id);
      setActiveId((curr) => {
        if (curr !== id) return curr;
        return next[0]?.id ?? "";
      });
      return next;
    });
    setByThread((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const onFilesSelected = useCallback(async (list: FileList | null) => {
    if (!list?.length) return;
    const next: MessengerAttachment[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (file.size > MAX_ATTACH_BYTES) continue;
      const attId = `a-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
      const isImg = file.type.startsWith("image/");
      if (isImg) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          next.push({ id: attId, kind: "image", name: file.name, dataUrl });
        } catch {
          next.push({ id: attId, kind: "file", name: file.name });
        }
      } else {
        next.push({ id: attId, kind: "file", name: file.name });
      }
    }
    if (next.length) setPendingAttachments((p) => [...p, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removePendingAttachment = useCallback((attId: string) => {
    setPendingAttachments((p) => p.filter((x) => x.id !== attId));
  }, []);

  const send = useCallback(() => {
    const text = draft.trim();
    const attachments = [...pendingAttachments];
    if ((!text && attachments.length === 0) || !activeId) return;
    const msg: MessengerMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      threadId: activeId,
      author: myAuthorId,
      text,
      createdAt: new Date().toISOString(),
      attachments: attachments.length ? attachments : undefined,
    };
    setByThread((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), msg],
    }));
    setDraft("");
    setPendingAttachments([]);
  }, [draft, activeId, pendingAttachments, myAuthorId]);

  const formatTime = useCallback((iso: string) => {
    try {
      return new Date(iso).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, []);

  const neoPlate = {
    borderRadius: 28,
    background: styles.sectionBg,
    boxShadow: styles.cardShadow,
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.88)",
  } as const;

  const hintBox = {
    fontSize: 10,
    color: styles.muted,
    marginTop: 10,
    padding: "8px 10px",
    borderRadius: 12,
    fontWeight: 600,
    lineHeight: 1.45,
    background: isDark ? "rgba(30, 41, 59, 0.35)" : "rgba(241, 245, 249, 0.85)",
    border: `1px solid ${isDark ? "rgba(56, 189, 248, 0.08)" : "rgba(148, 163, 184, 0.2)"}`,
  } as const;

  return (
    <section
      style={{
        ...neoPlate,
        padding: 0,
        display: narrow ? "flex" : "grid",
        flexDirection: narrow ? "column" : undefined,
        gridTemplateColumns: narrow ? undefined : "minmax(240px, 320px) minmax(0, 1fr)",
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflow: "hidden",
      }}
    >
      {inviteToast ? (
        <div
          role="status"
          style={{
            ...(narrow ? {} : { gridColumn: "1 / -1" }),
            padding: "12px 18px",
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.45,
            color: styles.text,
            background: isDark ? "rgba(56, 189, 248, 0.12)" : "rgba(36, 59, 116, 0.1)",
            borderBottom: isDark ? "1px solid rgba(56, 189, 248, 0.2)" : "1px solid rgba(36, 59, 116, 0.18)",
          }}
        >
          {inviteToast.mode === "added"
            ? `Контакт «${inviteToast.name}» добавлен по ссылке-приглашению.`
            : `Контакт «${inviteToast.name}» уже был в списке.`}
        </div>
      ) : null}
      <aside
        style={{
          borderRight: narrow ? "none" : isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.25)",
          borderBottom: narrow
            ? isDark
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(148,163,184,0.25)"
            : "none",
          display: "flex",
          flexDirection: "column",
          background: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.35)",
          maxHeight: narrow ? 320 : undefined,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "22px 20px 16px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.2)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: styles.muted, marginBottom: 6 }}>
              ДИАЛОГИ
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: styles.text }}>Собеседники</h2>
            <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.5, color: styles.muted }}>
              Выберите контакт для переписки. Добавить или убрать людей можно в настройках списка.
            </p>
          </div>
          <HoverTooltip
            preset={tooltipPreset}
            isDark={isDark}
            content={<span style={{ whiteSpace: "nowrap" }}>Настроить список собеседников</span>}
            wrapperStyle={{ flexShrink: 0 }}
          >
            <button
              type="button"
              aria-label="Настройки списка собеседников"
              aria-expanded={peerSettingsOpen}
              onClick={() => setPeerSettingsOpen(true)}
              style={{
                width: 42,
                height: 42,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.35)"}`,
                borderRadius: 14,
                background: styles.inputBg,
                boxShadow: styles.insetShadow,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                color: styles.muted,
                flexShrink: 0,
              }}
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </HoverTooltip>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minHeight: narrow ? 0 : undefined,
          }}
        >
          {peers.map((peer) => {
            const active = peer.id === activeId;
            const threadMsgs = byThread[peer.id] ?? [];
            const hide = new Set(hiddenForMe[peer.id] ?? []);
            const visibleThread = threadMsgs.filter((m) => !hide.has(m.id));
            const last = visibleThread.slice(-1)[0];
            const preview =
              last && last.text.trim()
                ? last.text
                : last?.attachments?.length
                  ? last.attachments[0].kind === "image"
                    ? "📷 Фото"
                    : `📎 ${last.attachments[0].name}`
                  : "";
            return (
              <button
                key={peer.id}
                type="button"
                onClick={() => setActiveId(peer.id)}
                style={{
                  width: "100%",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 18,
                  padding: "14px 14px",
                  fontFamily: "inherit",
                  background: active ? styles.cardBg : "transparent",
                  boxShadow: active ? styles.insetShadow : "none",
                  color: styles.text,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  transition: "background 0.15s ease",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 14 }}>{peer.name}</span>
                <span style={{ fontSize: 11, color: styles.muted, fontWeight: 600 }}>{peer.role}</span>
                {last && preview ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: styles.muted,
                      marginTop: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      opacity: 0.9,
                    }}
                  >
                    {last.author === myAuthorId ? "Вы: " : ""}
                    {preview}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          flex: 1,
          minWidth: 0,
        }}
      >
        {peers.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              padding: "48px 28px",
              textAlign: "center",
              color: styles.muted,
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.55,
              background: styles.sectionBg,
            }}
          >
            Список собеседников пуст. Нажмите шестерёнку выше и добавьте контакт — затем можно писать и прикреплять файлы.
          </div>
        ) : (
          <>
        <div
          style={{
            padding: "20px 24px",
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.2)",
            background: styles.cardBg,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, color: styles.text }}>{activePeer?.name ?? "—"}</div>
          <div style={{ fontSize: 12, color: styles.muted, fontWeight: 600, marginTop: 4 }}>
            {activePeer?.role ?? ""}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: styles.sectionBg,
          }}
        >
          {visibleMessages.length === 0 ? (
            <div style={{ color: styles.muted, fontSize: 14, textAlign: "center", marginTop: 40 }}>
              {messages.length > 0
                ? "Все сообщения в этом диалоге скрыты у вас или удалены."
                : "Напишите первое сообщение или прикрепите файл."}
            </div>
          ) : (
            visibleMessages.map((m) => {
              const mine = m.author === myAuthorId;
              const menuOpen = msgMenuId === m.id;
              const menuBg = isDark ? "rgba(30, 41, 59, 0.98)" : "#ffffff";
              const menuBorder = isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(148, 163, 184, 0.35)";
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "min(100%, 420px)",
                    position: "relative",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      role="group"
                      aria-label="Сообщение, удерживайте для меню"
                      onPointerDown={(e) => onBubblePointerDown(e, m)}
                      onPointerMove={onBubblePointerMove}
                      onPointerUp={onBubblePointerEnd}
                      onPointerCancel={onBubblePointerEnd}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{
                        padding: "12px 16px",
                        borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: mine
                          ? isDark
                            ? "linear-gradient(145deg, #243b74 0%, #1e3460 100%)"
                            : "linear-gradient(145deg, #3b5cad 0%, #243b74 100%)"
                          : isDark
                            ? "rgba(148, 163, 184, 0.14)"
                            : "rgba(100, 116, 139, 0.12)",
                        color: mine ? "#f8fafc" : styles.text,
                        boxShadow: mine ? "0 8px 20px rgba(36, 59, 116, 0.25)" : styles.insetShadow,
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        minWidth: 0,
                        cursor: "pointer",
                        touchAction: "manipulation",
                        WebkitUserSelect: "none",
                        userSelect: "none",
                      }}
                    >
                      {m.attachments?.length ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            marginBottom: m.text.trim() ? 10 : 0,
                          }}
                        >
                          {m.attachments.map((a) =>
                            a.kind === "image" && a.dataUrl ? (
                              <img
                                key={a.id}
                                src={a.dataUrl}
                                alt={a.name}
                                draggable={false}
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: 200,
                                  borderRadius: 12,
                                  display: "block",
                                  objectFit: "cover",
                                  pointerEvents: "none",
                                }}
                              />
                            ) : (
                              <div
                                key={a.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "8px 10px",
                                  borderRadius: 12,
                                  background: mine ? "rgba(15, 23, 42, 0.25)" : isDark ? "rgba(15,23,42,0.35)" : "rgba(241,245,249,0.95)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: mine ? "#e2e8f0" : styles.text,
                                }}
                              >
                                <span aria-hidden>📎</span>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                              </div>
                            )
                          )}
                        </div>
                      ) : null}
                      {m.text.trim() ? m.text : null}
                    </div>
                    {menuOpen ? (
                      <div
                        role="menu"
                        data-messenger-msg-menu-root
                        style={{
                          position: "absolute",
                          top: "100%",
                          marginTop: 6,
                          [mine ? "right" : "left"]: 0,
                          zIndex: 25,
                          minWidth: 216,
                          padding: 6,
                          borderRadius: 14,
                          background: menuBg,
                          border: `1px solid ${menuBorder}`,
                          boxShadow: isDark
                            ? "0 16px 40px rgba(0,0,0,0.45)"
                            : "0 12px 32px rgba(15,23,42,0.12)",
                        }}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => copyMessageToClipboard(m)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            borderRadius: 10,
                            padding: "10px 12px",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            background: "transparent",
                            color: styles.text,
                          }}
                        >
                          Скопировать
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            setMsgMenuId(null);
                            setForwardPickMsg(m);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            borderRadius: 10,
                            padding: "10px 12px",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            background: "transparent",
                            color: styles.text,
                          }}
                        >
                          Переслать
                        </button>
                        <div
                          style={{
                            height: 1,
                            margin: "4px 8px",
                            background: isDark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.25)",
                          }}
                        />
                        <button
                          type="button"
                          role="menuitem"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            hideMessageForMe(activeId, m.id);
                            setMsgMenuId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            borderRadius: 10,
                            padding: "10px 12px",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            background: "transparent",
                            color: styles.text,
                          }}
                        >
                          Удалить у меня
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            deleteMessageForEveryone(activeId, m.id);
                            setMsgMenuId(null);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            borderRadius: 10,
                            padding: "10px 12px",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            background: isDark ? "rgba(248, 113, 113, 0.12)" : "rgba(248, 113, 113, 0.14)",
                            color: "#f87171",
                            marginTop: 2,
                          }}
                        >
                          Удалить у всех
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: styles.muted,
                      marginTop: 6,
                      textAlign: mine ? "right" : "left",
                      paddingLeft: mine ? 0 : 4,
                      paddingRight: mine ? 4 : 0,
                    }}
                  >
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              );
            })
          )}
          <div ref={listEndRef} />
        </div>

        <div
          style={{
            padding: "16px 20px 20px",
            borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.2)",
            background: styles.cardBg,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.rtf,application/pdf"
            multiple
            style={{ display: "none" }}
            onChange={(e) => onFilesSelected(e.target.files)}
          />

          {pendingAttachments.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {pendingAttachments.map((a) => (
                <span
                  key={a.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: isDark ? "rgba(79, 128, 243, 0.15)" : "rgba(36, 59, 116, 0.08)",
                    border: `1px solid ${isDark ? "rgba(79, 128, 243, 0.3)" : "rgba(36, 59, 116, 0.2)"}`,
                    color: styles.text,
                    maxWidth: "100%",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.kind === "image" ? "🖼 " : "📎 "}
                    {a.name}
                  </span>
                  <button
                    type="button"
                    aria-label="Убрать вложение"
                    onClick={() => removePendingAttachment(a.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: styles.muted,
                      cursor: "pointer",
                      padding: 0,
                      margin: 0,
                      width: 22,
                      height: 22,
                      fontSize: 16,
                      lineHeight: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontFamily: "inherit",
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <HoverTooltip
              preset={tooltipPreset}
              isDark={isDark}
              content={<span>Прикрепить фото или документ</span>}
              wrapperStyle={{ flexShrink: 0, display: "flex", alignItems: "flex-end" }}
            >
              <button
                type="button"
                aria-label="Прикрепить файл"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 46,
                  height: 46,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148, 163, 184, 0.35)"}`,
                  borderRadius: 16,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  color: styles.muted,
                }}
              >
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </HoverTooltip>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Введите сообщение…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              style={{
                flex: 1,
                resize: "none",
                minHeight: 44,
                maxHeight: 120,
                padding: "12px 14px",
                borderRadius: 16,
                border: "none",
                fontSize: 14,
                color: styles.text,
                background: styles.inputBg,
                boxShadow: styles.insetShadow,
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.45,
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim() && pendingAttachments.length === 0}
              style={{
                border: "none",
                cursor: draft.trim() || pendingAttachments.length > 0 ? "pointer" : "not-allowed",
                opacity: draft.trim() || pendingAttachments.length > 0 ? 1 : 0.45,
                borderRadius: 999,
                padding: "12px 22px",
                fontWeight: 800,
                fontSize: 14,
                color: styles.buttonText,
                background: styles.buttonBg,
                boxShadow: styles.insetShadow,
                fontFamily: "inherit",
                flexShrink: 0,
                alignSelf: "center",
              }}
            >
              Отправить
            </button>
          </div>
          <div style={hintBox}>
            Enter — отправить · Shift+Enter — новая строка · удерживайте сообщение — меню · вложения до ~1,8 МБ каждое
          </div>
        </div>
          </>
        )}
      </div>

      {forwardPickMsg ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 12002,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
          onClick={() => setForwardPickMsg(null)}
        >
          <div
            role="dialog"
            aria-modal
            aria-labelledby="messenger-forward-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(400px, 100%)",
              maxHeight: "min(420px, calc(100vh - 32px))",
              overflow: "auto",
              borderRadius: 22,
              padding: "20px 18px 18px",
              background: styles.cardBg,
              color: styles.text,
              boxShadow: styles.cardShadow,
              border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(148,163,184,0.25)",
              fontFamily: "inherit",
            }}
          >
            <div style={{ position: "relative", marginBottom: 14, paddingRight: 36 }}>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setForwardPickMsg(null)}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  boxSizing: "border-box",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  padding: 0,
                  margin: 0,
                  color: styles.muted,
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 0,
                  zIndex: 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <h2 id="messenger-forward-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, paddingRight: 4 }}>
                Переслать в чат
              </h2>
              <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.5, color: styles.muted }}>
                Выберите собеседника — сообщение появится у вас в том диалоге.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {peers.filter((p) => p.id !== activeId).length === 0 ? (
                <div style={{ fontSize: 13, color: styles.muted, fontWeight: 600, padding: "12px 0", textAlign: "center" }}>
                  Нет других диалогов — добавьте контакт в настройках.
                </div>
              ) : (
                peers
                  .filter((p) => p.id !== activeId)
                  .map((peer) => (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={() => forwardPickMsg && confirmForwardToPeer(forwardPickMsg, peer.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.22)",
                        borderRadius: 14,
                        padding: "12px 14px",
                        fontFamily: "inherit",
                        cursor: "pointer",
                        background: styles.sectionBg,
                        color: styles.text,
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{peer.name}</div>
                      <div style={{ fontSize: 11, color: styles.muted, fontWeight: 600, marginTop: 2 }}>{peer.role}</div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {peerSettingsOpen ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 12000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
          onClick={() => setPeerSettingsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal
            aria-labelledby="messenger-peer-settings-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(440px, 100%)",
              maxHeight: "min(560px, calc(100vh - 32px))",
              overflow: "auto",
              borderRadius: 22,
              padding: "22px 20px 20px",
              background: styles.cardBg,
              color: styles.text,
              boxShadow: styles.cardShadow,
              border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(148,163,184,0.25)",
              fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <h2 id="messenger-peer-settings-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  Настройки списка
                </h2>
                <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.5, color: styles.muted }}>
                  Добавляйте и удаляйте собеседников здесь.
                </p>
              </div>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setPeerSettingsOpen(false)}
                style={{
                  width: 30,
                  height: 30,
                  boxSizing: "border-box",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  padding: 0,
                  margin: 0,
                  color: styles.muted,
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.15)",
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div
              style={{
                marginBottom: 18,
                padding: "14px 14px",
                borderRadius: 14,
                background: styles.sectionBg,
                border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.22)",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: styles.muted, marginBottom: 8 }}>
                ПРИГЛАШЕНИЕ ПО ССЫЛКЕ
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 12, lineHeight: 1.55, color: styles.muted }}>
                Скопируйте свою ссылку и отправьте другу — или вставьте ссылку друга ниже, чтобы добавить его к себе. Имя и
                роль в приглашении берутся из настроек профиля.
              </p>
              <button
                type="button"
                onClick={() => void copyInviteLink()}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 800,
                  fontSize: 13,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  color: styles.buttonText,
                  background: styles.buttonBg,
                  boxShadow: styles.insetShadow,
                  marginBottom: 14,
                }}
              >
                {inviteCopied ? "Ссылка скопирована" : "Скопировать ссылку-приглашение"}
              </button>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: styles.muted, marginBottom: 6 }}>
                Ссылка друга (вставить)
              </label>
              <textarea
                value={invitePasteField}
                onChange={(e) => {
                  setInvitePasteField(e.target.value);
                  setInvitePasteError(null);
                }}
                placeholder="Вставьте ссылку из буфера: Ctrl+V"
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  marginBottom: 8,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "none",
                  fontSize: 12,
                  lineHeight: 1.45,
                  fontFamily: "inherit",
                  color: styles.text,
                  background: styles.inputBg,
                  boxShadow: styles.insetShadow,
                  outline: "none",
                  resize: "vertical",
                  minHeight: 56,
                }}
              />
              {invitePasteError ? (
                <p style={{ margin: "0 0 8px", fontSize: 12, lineHeight: 1.45, color: "#f87171" }}>{invitePasteError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => applyPastedFriendInvite()}
                disabled={!invitePasteField.trim()}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 800,
                  fontSize: 13,
                  fontFamily: "inherit",
                  cursor: invitePasteField.trim() ? "pointer" : "not-allowed",
                  opacity: invitePasteField.trim() ? 1 : 0.5,
                  color: styles.buttonText,
                  background: styles.buttonBg,
                  boxShadow: styles.insetShadow,
                }}
              >
                {invitePasteApplied ? "Друг добавлен в список" : "Добавить друга по вставленной ссылке"}
              </button>
            </div>

            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: styles.muted, marginBottom: 8 }}>
              НОВЫЙ КОНТАКТ
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Имя"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 8,
                padding: "10px 12px",
                borderRadius: 12,
                border: "none",
                fontSize: 13,
                fontFamily: "inherit",
                color: styles.text,
                background: styles.inputBg,
                boxShadow: styles.insetShadow,
                outline: "none",
              }}
            />
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Роль (необязательно)"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 12,
                border: "none",
                fontSize: 13,
                fontFamily: "inherit",
                color: styles.text,
                background: styles.inputBg,
                boxShadow: styles.insetShadow,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={addPeer}
              disabled={!newName.trim()}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 14,
                padding: "11px 14px",
                fontWeight: 800,
                fontSize: 13,
                fontFamily: "inherit",
                cursor: newName.trim() ? "pointer" : "not-allowed",
                opacity: newName.trim() ? 1 : 0.45,
                color: styles.buttonText,
                background: styles.buttonBg,
                boxShadow: styles.insetShadow,
                marginBottom: 20,
              }}
            >
              Добавить собеседника
            </button>

            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: styles.muted, marginBottom: 10 }}>
              ТЕКУЩИЙ СПИСОК
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {peers.map((peer) => (
                <div
                  key={peer.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: styles.sectionBg,
                    border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.2)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{peer.name}</div>
                    <div style={{ fontSize: 11, color: styles.muted, fontWeight: 600, marginTop: 2 }}>{peer.role}</div>
                  </div>
                  <HoverTooltip
                    preset={tooltipPreset}
                    isDark={isDark}
                    content={<span>Удалить из списка</span>}
                    wrapperStyle={{ flexShrink: 0 }}
                  >
                    <button
                      type="button"
                      aria-label={`Удалить ${peer.name}`}
                      onClick={() => removePeer(peer.id)}
                      style={{
                        width: 30,
                        height: 30,
                        boxSizing: "border-box",
                        border: "none",
                        borderRadius: 10,
                        cursor: "pointer",
                        padding: 0,
                        margin: 0,
                        color: styles.muted,
                        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.15)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                      </svg>
                    </button>
                  </HoverTooltip>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPeerSettingsOpen(false)}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 14,
                padding: "12px 16px",
                fontWeight: 800,
                fontSize: 14,
                fontFamily: "inherit",
                cursor: "pointer",
                color: styles.buttonText,
                background: styles.buttonBg,
                boxShadow: styles.insetShadow,
              }}
            >
              Готово
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
});
