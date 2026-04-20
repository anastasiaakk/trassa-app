import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getAssistantReply } from "../utils/aiAssistantReply";
import {
  buildMessengerNotifyText,
  collectAllIncomingMessageIds,
  findNewIncomingNotAnnounced,
  loadAnnouncedIdsFromSession,
  playMessengerIncomingSound,
  saveAnnouncedIdsToSession,
  TBOT_MSGR_ANNOUNCED_IDS_KEY,
  tryOsPushNotify,
} from "../utils/messengerTbotNotify";
import {
  loadTBotAppearance,
  saveTBotAppearance,
  type TBotAccessory,
  type TBotAppearance,
} from "./tbotAppearance";
import { getTBotMoodLabel, TBotMascot, type TBotMood } from "./TBotMascot";
import { BattleshipMiniGame } from "./BattleshipMiniGame";
import { getHoverTooltipPreset, HoverTooltip } from "./HoverTooltip";

const STORAGE_KEY = "trassa-ai-bubble-pos";
const PANEL_POS_KEY = "trassa-ai-panel-pos";
const BUBBLE = 56;
const MARGIN = 12;
/** Подсказка у иконки Т-бота — только после удержания курсора (мс). */
const TBOT_ICON_TOOLTIP_DELAY_MS = 1000;
const DRAG_THRESHOLD = 6;
const PANEL_W = 400;
const PANEL_H = 520;
const SCROLL_BOTTOM_THRESHOLD = 72;
const TBOT_READ_AI_ID_KEY = "trassa-tbot-read-ai-id";

const ACCESSORY_OPTIONS: { value: TBotAccessory; label: string }[] = [
  { value: "none", label: "Нет" },
  { value: "glasses", label: "Очки" },
  { value: "starGlasses", label: "Звёздные очки" },
  { value: "headphones", label: "Наушники" },
  { value: "crown", label: "Корона" },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function loadPos(): { left: number; top: number } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { left: number; top: number };
    if (typeof p.left === "number" && typeof p.top === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

function savePos(left: number, top: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
  } catch {
    /* ignore */
  }
}

function loadPanelPos(): { left: number; top: number } | null {
  try {
    const raw = sessionStorage.getItem(PANEL_POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { left: number; top: number };
    if (typeof p.left === "number" && typeof p.top === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

function savePanelPos(left: number, top: number) {
  try {
    sessionStorage.setItem(PANEL_POS_KEY, JSON.stringify({ left, top }));
  } catch {
    /* ignore */
  }
}

type Msg = { id: string; role: "user" | "ai"; text: string; ts: number };

function lastAiMessageId(messages: Msg[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "ai") return messages[i].id;
  }
  return undefined;
}

type Props = {
  isDark: boolean;
};

function formatMsgTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const AiChatBubble = memo(function AiChatBubble({ isDark }: Props) {
  const [pos, setPos] = useState<{ left: number; top: number }>(() => {
    if (typeof window === "undefined") return { left: 100, top: 100 };
    const saved = loadPos();
    if (saved) {
      return {
        left: clamp(saved.left, MARGIN, window.innerWidth - BUBBLE - MARGIN),
        top: clamp(saved.top, MARGIN, window.innerHeight - BUBBLE - MARGIN),
      };
    }
    return {
      left: window.innerWidth - BUBBLE - MARGIN - 8,
      top: window.innerHeight - BUBBLE - MARGIN - 8,
    };
  });

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const now = Date.now();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "ai",
      ts: now,
      text:
        "Бип-буп! Я Т-бот — помогу по кабинету ТрассА и просто пообщаюсь по-человечески: могу познакомиться поближе, поддержать и послушать. Расскажите, как ваш день и что на душе — или спросите, что умею.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [tbotMood, setTbotMood] = useState<TBotMood>("neutral");
  const [showJumpLatest, setShowJumpLatest] = useState(false);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = loadPanelPos();
    if (!saved) return null;
    return {
      left: clamp(saved.left, MARGIN, window.innerWidth - PANEL_W - MARGIN),
      top: clamp(saved.top, MARGIN, window.innerHeight - PANEL_H - MARGIN),
    };
  });
  const [panelDragging, setPanelDragging] = useState(false);
  const [appearance, setAppearance] = useState<TBotAppearance>(() => loadTBotAppearance());
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [miniGameOpen, setMiniGameOpen] = useState(false);
  const [tipToast, setTipToast] = useState<{ title: string; text: string } | null>(null);
  const tipToastTimerRef = useRef<number | undefined>(undefined);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const patchAppearance = useCallback((patch: Partial<TBotAppearance>) => {
    setAppearance((prev) => {
      const next: TBotAppearance = { ...prev, ...patch };
      saveTBotAppearance(next);
      return next;
    });
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const moodTimersRef = useRef<number[]>([]);

  const clearMoodTimers = useCallback(() => {
    moodTimersRef.current.forEach((id) => window.clearTimeout(id));
    moodTimersRef.current = [];
  }, []);

  const scheduleMood = useCallback(
    (sequence: { mood: TBotMood; afterMs: number }[]) => {
      clearMoodTimers();
      let acc = 0;
      sequence.forEach(({ mood, afterMs }) => {
        acc += afterMs;
        const id = window.setTimeout(() => setTbotMood(mood), acc);
        moodTimersRef.current.push(id);
      });
    },
    [clearMoodTimers]
  );

  useEffect(() => {
    const onMessengerStoreUpdate = () => {
      try {
        if (!sessionStorage.getItem(TBOT_MSGR_ANNOUNCED_IDS_KEY)) {
          saveAnnouncedIdsToSession(collectAllIncomingMessageIds());
          return;
        }
        const announced = loadAnnouncedIdsFromSession();
        const fresh = findNewIncomingNotAnnounced(announced);
        if (fresh.length === 0) return;
        playMessengerIncomingSound();
        const text = buildMessengerNotifyText(fresh);
        tryOsPushNotify("Мессенджер", text);
        const next = new Set(announced);
        fresh.forEach((m) => next.add(m.id));
        saveAnnouncedIdsToSession(next);
        if (tipToastTimerRef.current) window.clearTimeout(tipToastTimerRef.current);
        setTipToast({ title: "Мессенджер", text });
        tipToastTimerRef.current = window.setTimeout(() => {
          setTipToast(null);
          tipToastTimerRef.current = undefined;
        }, 14000);
        setTbotMood("curious");
        scheduleMood([
          { mood: "happy", afterMs: 450 },
          { mood: "neutral", afterMs: 3000 },
        ]);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("trassa-messenger-updated", onMessengerStoreUpdate);
    queueMicrotask(() => {
      try {
        window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
      } catch {
        /* ignore */
      }
    });
    return () => window.removeEventListener("trassa-messenger-updated", onMessengerStoreUpdate);
  }, [scheduleMood]);

  useEffect(() => {
    if (!open) return;
    if (tipToastTimerRef.current) window.clearTimeout(tipToastTimerRef.current);
    tipToastTimerRef.current = undefined;
    setTipToast(null);
  }, [open]);

  useEffect(
    () => () => {
      if (tipToastTimerRef.current) window.clearTimeout(tipToastTimerRef.current);
    },
    []
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    listEndRef.current?.scrollIntoView({ behavior, block: "end" });
    stickToBottomRef.current = true;
    setShowJumpLatest(false);
  }, []);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distFromBottom < SCROLL_BOTTOM_THRESHOLD;
    stickToBottomRef.current = atBottom;
    setShowJumpLatest(!atBottom && scrollHeight > clientHeight + 40);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTbotMood("curious");
    const id = window.setTimeout(() => setTbotMood("neutral"), 2200);
    return () => window.clearTimeout(id);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    scrollToBottom("auto");
  }, [open, scrollToBottom]);

  useEffect(() => () => clearMoodTimers(), [clearMoodTimers]);

  useEffect(() => {
    if (!open) setMiniGameOpen(false);
  }, [open]);

  const displayMood: TBotMood = pending ? "thinking" : tbotMood;

  const [showAiUnreadDot, setShowAiUnreadDot] = useState(false);

  useEffect(() => {
    const lai = lastAiMessageId(messages);
    if (!lai) {
      setShowAiUnreadDot(false);
      return;
    }
    let readId: string | null = null;
    try {
      readId = localStorage.getItem(TBOT_READ_AI_ID_KEY);
    } catch {
      readId = null;
    }
    if (!readId) {
      try {
        localStorage.setItem(TBOT_READ_AI_ID_KEY, lai);
      } catch {
        /* ignore */
      }
      setShowAiUnreadDot(false);
      return;
    }
    if (open) {
      if (readId !== lai) {
        try {
          localStorage.setItem(TBOT_READ_AI_ID_KEY, lai);
        } catch {
          /* ignore */
        }
      }
      setShowAiUnreadDot(false);
    } else {
      setShowAiUnreadDot(lai !== readId);
    }
  }, [messages, open]);

  useLayoutEffect(() => {
    if (!open) return;
    if (stickToBottomRef.current) {
      listEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [messages, pending, open]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => updateScrollState());
    return () => cancelAnimationFrame(id);
  }, [open, messages.length, pending, updateScrollState]);

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
    moved: false,
  });

  const panelDragRef = useRef({
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
  });

  const defaultPanelPos = useMemo(() => {
    const left = clamp(
      pos.left - PANEL_W + BUBBLE,
      MARGIN,
      typeof window !== "undefined" ? window.innerWidth - PANEL_W - MARGIN : 8
    );
    let top = pos.top - PANEL_H - MARGIN;
    if (typeof window !== "undefined") {
      if (top < MARGIN) {
        top = pos.top + BUBBLE + MARGIN;
      }
      if (top + PANEL_H > window.innerHeight - MARGIN) {
        top = clamp(window.innerHeight - PANEL_H - MARGIN, MARGIN, top);
      }
    }
    return { left, top };
  }, [pos.left, pos.top]);

  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        left: clamp(p.left, MARGIN, window.innerWidth - BUBBLE - MARGIN),
        top: clamp(p.top, MARGIN, window.innerHeight - BUBBLE - MARGIN),
      }));
      setPanelPos((pp) => {
        if (!pp) return null;
        return {
          left: clamp(pp.left, MARGIN, window.innerWidth - PANEL_W - MARGIN),
          top: clamp(pp.top, MARGIN, window.innerHeight - PANEL_H - MARGIN),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onBubblePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originLeft: pos.left,
        originTop: pos.top,
        moved: false,
      };
      setDragging(true);

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          dragRef.current.moved = true;
        }
        const left = clamp(
          dragRef.current.originLeft + dx,
          MARGIN,
          window.innerWidth - BUBBLE - MARGIN
        );
        const top = clamp(
          dragRef.current.originTop + dy,
          MARGIN,
          window.innerHeight - BUBBLE - MARGIN
        );
        setPos({ left, top });
      };

      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        setDragging(false);
        setPos((current) => {
          savePos(current.left, current.top);
          return current;
        });
        if (!dragRef.current.moved) {
          setOpen((o) => !o);
        }
        dragRef.current.moved = false;
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    },
    [pos.left, pos.top]
  );

  const onPanelHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      const el = e.currentTarget;
      const originLeft = panelPos?.left ?? defaultPanelPos.left;
      const originTop = panelPos?.top ?? defaultPanelPos.top;
      panelDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originLeft,
        originTop,
      };
      setPanelDragging(true);
      el.setPointerCapture(e.pointerId);

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - panelDragRef.current.startX;
        const dy = ev.clientY - panelDragRef.current.startY;
        const left = clamp(
          panelDragRef.current.originLeft + dx,
          MARGIN,
          window.innerWidth - PANEL_W - MARGIN
        );
        const top = clamp(
          panelDragRef.current.originTop + dy,
          MARGIN,
          window.innerHeight - PANEL_H - MARGIN
        );
        setPanelPos({ left, top });
      };

      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        setPanelDragging(false);
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        setPanelPos((current) => {
          if (current) savePanelPos(current.left, current.top);
          return current;
        });
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    },
    [panelPos, defaultPanelPos.left, defaultPanelPos.top]
  );

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || pending) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text, ts: Date.now() };
    const nextThread = [...messages, userMsg];
    setMessages(nextThread);
    stickToBottomRef.current = true;
    setDraft("");
    setPending(true);
    const typingDelay = 520 + Math.random() * 480;
    await new Promise((r) => window.setTimeout(r, typingDelay));
    try {
      const historyForModel = nextThread.map((m) => ({ role: m.role, text: m.text }));
      const replyText = await getAssistantReply(historyForModel);
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: "ai", text: replyText, ts: Date.now() },
      ]);
      setTbotMood("talking");
      scheduleMood([
        { mood: "happy", afterMs: 800 },
        { mood: "neutral", afterMs: 2600 },
      ]);
      if (!openRef.current) {
        playMessengerIncomingSound();
        tryOsPushNotify("Т-бот", "Готов ответ — откройте чат с ассистентом.");
        if (tipToastTimerRef.current) window.clearTimeout(tipToastTimerRef.current);
        const preview =
          replyText.length > 120 ? `${replyText.slice(0, 117).trimEnd()}…` : replyText;
        setTipToast({
          title: "Т-бот",
          text: `Ответ готов: ${preview}`,
        });
        tipToastTimerRef.current = window.setTimeout(() => {
          setTipToast(null);
          tipToastTimerRef.current = undefined;
        }, 14000);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          text: "Бип… не вышло связаться с моим процессором. Попробуйте ещё раз чуть позже.",
          ts: Date.now(),
        },
      ]);
      setTbotMood("worried");
      scheduleMood([{ mood: "neutral", afterMs: 2600 }]);
    } finally {
      setPending(false);
    }
  }, [draft, pending, messages, scheduleMood]);

  const panelLeft = panelPos?.left ?? defaultPanelPos.left;
  const panelTop = panelPos?.top ?? defaultPanelPos.top;

  const muted = isDark ? "#94a3b8" : "#64748b";
  const text = isDark ? "#f1f5f9" : "#0f172a";
  const card = isDark ? "#0f172a" : "#f8fafc";
  const cardBorder = isDark ? "rgba(56, 189, 248, 0.15)" : "rgba(148, 163, 184, 0.35)";
  const insetShadow = isDark
    ? "inset 8px 8px 18px rgba(0, 0, 0, 0.28)"
    : "inset 8px 8px 18px rgba(148, 154, 178, 0.12), inset -4px -4px 12px rgba(255, 255, 255, 0.95)";
  const outerShadow = isDark
    ? "0 24px 48px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(56, 189, 248, 0.12)"
    : "0 20px 40px rgba(15, 23, 42, 0.1), 0 8px 16px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(255,255,255,0.9)";

  const headerBg = isDark
    ? "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #172554 100%)"
    : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 45%, #f1f5f9 100%)";

  const userBubble = isDark
    ? "linear-gradient(155deg, #2563eb 0%, #1d4ed8 55%, #1e40af 100%)"
    : "linear-gradient(155deg, #3b82f6 0%, #2563eb 100%)";

  const aiBubbleBg = isDark ? "rgba(30, 41, 59, 0.92)" : "rgba(255, 255, 255, 0.95)";
  const aiBubbleBorder = isDark ? "1px solid rgba(56, 189, 248, 0.2)" : "1px solid rgba(148, 163, 184, 0.35)";

  const tooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-label="Чат с Т-ботом"
          style={{
            position: "fixed",
            zIndex: 10040,
            left: panelLeft,
            top: panelTop,
            width: PANEL_W,
            maxWidth: "min(400px, calc(100vw - 20px))",
            maxHeight: `min(${PANEL_H}px, calc(100vh - 20px))`,
            display: "flex",
            flexDirection: "column",
            borderRadius: 20,
            background: card,
            color: text,
            boxShadow: outerShadow,
            border: `1px solid ${cardBorder}`,
            overflow: "hidden",
            fontFamily: "Inter, system-ui, sans-serif",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            role="presentation"
            onPointerDown={onPanelHeaderPointerDown}
            style={{
              padding: "14px 16px",
              borderBottom: `1px solid ${isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.25)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              background: headerBg,
              flexShrink: 0,
              cursor: panelDragging ? "grabbing" : "grab",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <HoverTooltip
                preset={tooltipPreset}
                isDark={isDark}
                content={<span style={{ whiteSpace: "nowrap" }}>Настроить облик Т-бота</span>}
                wrapperStyle={{ flexShrink: 0 }}
              >
                <button
                  type="button"
                  aria-label="Настроить аксессуары Т-бота"
                  aria-expanded={customizeOpen}
                  onClick={() => setCustomizeOpen((o) => !o)}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    border: "none",
                    borderRadius: 14,
                    padding: 4,
                    background: isDark ? "rgba(56, 189, 248, 0.1)" : "rgba(59, 130, 246, 0.12)",
                    boxShadow: isDark ? "inset 0 0 0 1px rgba(56,189,248,0.2)" : "none",
                    cursor: "pointer",
                    lineHeight: 0,
                    flexShrink: 0,
                  }}
                >
                  <TBotMascot mood={displayMood} size={44} appearance={appearance} />
                </button>
              </HoverTooltip>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>Т-бот</div>
                <div style={{ fontSize: 11, color: muted, fontWeight: 600, marginTop: 2 }}>
                  {getTBotMoodLabel(displayMood)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <HoverTooltip
                preset={tooltipPreset}
                isDark={isDark}
                content={<span style={{ whiteSpace: "nowrap" }}>Морской бой с Т-ботом</span>}
                wrapperStyle={{ flexShrink: 0 }}
              >
                <button
                  type="button"
                  aria-label="Открыть игру морской бой с ИИ"
                  onClick={() => setMiniGameOpen(true)}
                  onPointerDown={(ev) => ev.stopPropagation()}
                  style={{
                    border: `1px solid ${isDark ? "rgba(56, 189, 248, 0.25)" : "rgba(59, 130, 246, 0.25)"}`,
                    background: isDark ? "rgba(56, 189, 248, 0.1)" : "rgba(59, 130, 246, 0.08)",
                    color: muted,
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    cursor: "pointer",
                    padding: 0,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                    style={{ display: "block", pointerEvents: "none" }}
                  >
                    <path
                      d="M3 17c2.5-1.5 5.5-1.5 8 0s5.5 1.5 8 0"
                      stroke="currentColor"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      opacity={0.55}
                    />
                    <path
                      d="M4 14h16l-1.5 4H5.5L4 14z"
                      stroke="currentColor"
                      strokeWidth={1.35}
                      strokeLinejoin="round"
                      fill={isDark ? "rgba(56,189,248,0.12)" : "rgba(59,130,246,0.1)"}
                    />
                    <path d="M7 14V11h10v3" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
                    <circle cx="12" cy="9" r="1.2" fill="currentColor" opacity={0.7} />
                  </svg>
                </button>
              </HoverTooltip>
              <button
                type="button"
                onClick={() => setOpen(false)}
                onPointerDown={(ev) => ev.stopPropagation()}
                aria-label="Закрыть"
                style={{
                  border: "none",
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                  color: muted,
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  cursor: "pointer",
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                  style={{ display: "block", pointerEvents: "none" }}
                >
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {customizeOpen ? (
            <div
              role="region"
              aria-label="Настройки внешнего вида Т-бота"
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                padding: "12px 14px 14px",
                borderBottom: `1px solid ${isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.25)"}`,
                flexShrink: 0,
                background: isDark ? "rgba(30, 41, 59, 0.55)" : "rgba(241, 245, 249, 0.95)",
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: muted,
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Аксессуары
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ACCESSORY_OPTIONS.map((opt) => {
                  const selected = appearance.accessory === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => patchAppearance({ accessory: opt.value })}
                      style={{
                        border: `1px solid ${
                          selected
                            ? isDark
                              ? "rgba(56, 189, 248, 0.55)"
                              : "rgba(37, 99, 235, 0.45)"
                            : isDark
                              ? "rgba(148,163,184,0.2)"
                              : "rgba(148,163,184,0.35)"
                        }`,
                        borderRadius: 10,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        background: selected
                          ? isDark
                            ? "rgba(56, 189, 248, 0.2)"
                            : "rgba(59, 130, 246, 0.14)"
                          : isDark
                            ? "rgba(15, 23, 42, 0.4)"
                            : "#fff",
                        color: text,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div style={{ position: "relative", flex: 1, minHeight: 220, display: "flex", flexDirection: "column" }}>
            <div
              ref={scrollRef}
              onScroll={updateScrollState}
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "16px 14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                scrollbarWidth: "thin",
                scrollbarColor: isDark ? "rgba(56,189,248,0.35) transparent" : "rgba(100,116,139,0.4) transparent",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: muted,
                  marginBottom: 4,
                }}
              >
                Диалог · ТрассА
              </div>

              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: m.role === "user" ? "flex-end" : "flex-start",
                    gap: 6,
                    maxWidth: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: m.role === "user" ? "row-reverse" : "row",
                      alignItems: "flex-end",
                      gap: 8,
                      maxWidth: "94%",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 10,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        background:
                          m.role === "user"
                            ? isDark
                              ? "rgba(96, 165, 250, 0.25)"
                              : "rgba(37, 99, 235, 0.15)"
                            : isDark
                              ? "rgba(56, 189, 248, 0.15)"
                              : "rgba(59, 130, 246, 0.12)",
                        color: m.role === "user" ? "#bfdbfe" : "#38bdf8",
                        border: `1px solid ${m.role === "user" ? "rgba(96,165,250,0.3)" : "rgba(56,189,248,0.25)"}`,
                      }}
                    >
                      {m.role === "user" ? "Вы" : "Т"}
                    </div>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: m.role === "user" ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                        background: m.role === "user" ? userBubble : aiBubbleBg,
                        color: m.role === "user" ? "#f8fafc" : text,
                        border: m.role === "user" ? "none" : aiBubbleBorder,
                        fontSize: 14,
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        boxShadow:
                          m.role === "user"
                            ? "0 8px 24px rgba(37, 99, 235, 0.25)"
                            : isDark
                              ? "0 4px 16px rgba(0,0,0,0.2)"
                              : "0 4px 14px rgba(15, 23, 42, 0.06)",
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: muted,
                      paddingLeft: m.role === "user" ? 0 : 36,
                      paddingRight: m.role === "user" ? 36 : 0,
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    {formatMsgTime(m.ts)}
                  </div>
                </div>
              ))}

              {pending ? (
                <div
                  style={{
                    alignSelf: "flex-start",
                    marginLeft: 36,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 16,
                    background: isDark ? "rgba(30, 41, 59, 0.85)" : "rgba(241, 245, 249, 0.95)",
                    border: aiBubbleBorder,
                  }}
                >
                  <span style={{ fontSize: 12, color: muted, fontWeight: 600 }}>Т-бот печатает</span>
                  <span className="tbot-typing-dots" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                  <style>{`
                    .tbot-typing-dots { display: inline-flex; gap: 4px; align-items: center; }
                    .tbot-typing-dots span {
                      width: 6px; height: 6px; border-radius: 50%;
                      background: ${isDark ? "#38bdf8" : "#3b82f6"};
                      animation: tbot-dot 1.2s ease-in-out infinite;
                    }
                    .tbot-typing-dots span:nth-child(2) { animation-delay: 0.15s; }
                    .tbot-typing-dots span:nth-child(3) { animation-delay: 0.3s; }
                    @keyframes tbot-dot {
                      0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
                      30% { opacity: 1; transform: translateY(-3px); }
                    }
                  `}</style>
                </div>
              ) : null}
              <div ref={listEndRef} style={{ height: 1, flexShrink: 0 }} />
            </div>

            {showJumpLatest ? (
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 3,
                  border: "none",
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "#f8fafc",
                  background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                  boxShadow: "0 8px 20px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 14 }}>↓</span>
                К последнему
              </button>
            ) : null}
          </div>

          <div
            style={{
              padding: "14px 14px 16px",
              borderTop: `1px solid ${isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.22)"}`,
              background: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(248, 250, 252, 0.95)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
                padding: "4px 4px 4px 14px",
                borderRadius: 16,
                background: isDark ? "rgba(30, 41, 59, 0.65)" : "#fff",
                boxShadow: insetShadow,
                border: `1px solid ${isDark ? "rgba(56, 189, 248, 0.08)" : "rgba(148, 163, 184, 0.25)"}`,
              }}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Сообщение для Т-бота…"
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
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 0",
                  minHeight: 44,
                  maxHeight: 120,
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: text,
                  background: "transparent",
                  outline: "none",
                  lineHeight: 1.45,
                }}
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || pending}
                aria-label="Отправить"
                style={{
                  alignSelf: "stretch",
                  minWidth: 48,
                  margin: 4,
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 18,
                  cursor: draft.trim() && !pending ? "pointer" : "not-allowed",
                  opacity: draft.trim() && !pending ? 1 : 0.4,
                  background:
                    draft.trim() && !pending
                      ? "linear-gradient(145deg, #2563eb 0%, #4f46e5 100%)"
                      : isDark
                        ? "rgba(71, 85, 105, 0.5)"
                        : "rgba(148, 163, 184, 0.4)",
                  color: "#f8fafc",
                  fontFamily: "inherit",
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  boxShadow: draft.trim() && !pending ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
                }}
              >
                ➤
              </button>
            </div>
            <div
              style={{
                fontSize: 10,
                color: muted,
                marginTop: 10,
                paddingLeft: 4,
                fontWeight: 600,
                lineHeight: 1.45,
                padding: "8px 10px",
                borderRadius: 12,
                background: isDark ? "rgba(30, 41, 59, 0.35)" : "rgba(241, 245, 249, 0.85)",
                border: `1px solid ${isDark ? "rgba(56, 189, 248, 0.08)" : "rgba(148, 163, 184, 0.2)"}`,
              }}
            >
              Enter — отправить · Shift+Enter — новая строка
            </div>
          </div>
        </div>
      ) : null}

      <BattleshipMiniGame isOpen={miniGameOpen} onClose={() => setMiniGameOpen(false)} isDark={isDark} />

      {tipToast ? (
        <div
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            width: BUBBLE,
            height: BUBBLE,
            zIndex: 10042,
            pointerEvents: "none",
          }}
        >
          <div style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "none" }}>
            <div
              role="status"
              aria-live="polite"
              style={{
                position: "absolute",
                right: "calc(100% + 12px)",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 3,
                width: "max-content",
                maxWidth: "min(268px, calc(100vw - 88px))",
                padding: "10px 30px 10px 12px",
                borderRadius: 14,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.45,
                color: text,
                background: isDark ? "rgba(15, 23, 42, 0.96)" : "#ffffff",
                border: isDark ? "1px solid rgba(56, 189, 248, 0.28)" : "1px solid rgba(148, 163, 184, 0.4)",
                boxShadow: isDark
                  ? "0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(56,189,248,0.12)"
                  : "0 12px 28px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)",
                pointerEvents: "auto",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: muted, marginBottom: 4 }}>
                {tipToast.title}
              </div>
              <div style={{ wordBreak: "break-word" }}>{tipToast.text}</div>
              <button
                type="button"
                aria-label="Закрыть уведомление"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (tipToastTimerRef.current) window.clearTimeout(tipToastTimerRef.current);
                  tipToastTimerRef.current = undefined;
                  setTipToast(null);
                }}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 20,
                  height: 20,
                  boxSizing: "border-box",
                  border: "none",
                  borderRadius: 6,
                  padding: 0,
                  margin: 0,
                  cursor: "pointer",
                  background: isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.2)",
                  color: muted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 0,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <HoverTooltip
        preset={tooltipPreset}
        isDark={isDark}
        showDelayMs={TBOT_ICON_TOOLTIP_DELAY_MS}
        content={
          <span style={{ maxWidth: 260, display: "block", lineHeight: 1.45 }}>
            Перетащите Т-бота. Клик — открыть или закрыть чат.
            {showAiUnreadDot ? " Есть непрочитанный ответ." : ""}
            {tipToast ? " Слева от иконки — подсказка о новых сообщениях или ответе Т-бота." : ""}
          </span>
        }
        wrapperStyle={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: BUBBLE,
          height: BUBBLE,
          zIndex: 10041,
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <button
            type="button"
            aria-label="Т-бот — перетащите или нажмите, чтобы открыть чат"
            onPointerDown={onBubblePointerDown}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "none",
              cursor: dragging ? "grabbing" : "grab",
              padding: 0,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(160deg, #1e293b 0%, #334155 40%, #0f172a 100%)",
              boxShadow: `${outerShadow}, 0 0 0 2px rgba(56, 189, 248, 0.35) inset`,
              touchAction: "none",
            }}
          >
            <TBotMascot mood={displayMood} size={40} withFloat={!dragging} appearance={appearance} />
          </button>
          {showAiUnreadDot ? (
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#f87171",
                boxShadow: isDark
                  ? "0 0 0 2px #0f172a, 0 2px 6px rgba(0,0,0,0.45)"
                  : "0 0 0 2px #ffffff, 0 2px 6px rgba(15,23,42,0.25)",
                pointerEvents: "none",
              }}
            />
          ) : null}
        </div>
      </HoverTooltip>
    </>
  );
});
