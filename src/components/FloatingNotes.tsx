import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getHoverTooltipPreset, HoverTooltip } from "./HoverTooltip";

const NOTES_BODY_KEY = "trassa-floating-notes-body";
const NOTES_FAB_POS_KEY = "trassa-floating-notes-fab-pos";
const NOTES_PANEL_POS_KEY = "trassa-floating-notes-panel-pos";
const FAB = 52;
const MARGIN = 12;
const PANEL_W = 300;
const PANEL_H = 380;
const DRAG_THRESHOLD = 5;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function loadBody(): string {
  try {
    return localStorage.getItem(NOTES_BODY_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveBody(s: string) {
  try {
    localStorage.setItem(NOTES_BODY_KEY, s);
  } catch {
    /* ignore */
  }
}

function loadFabPos(): { left: number; top: number } | null {
  try {
    const raw = sessionStorage.getItem(NOTES_FAB_POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { left: number; top: number };
    if (typeof p.left === "number" && typeof p.top === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

function saveFabPos(left: number, top: number) {
  try {
    sessionStorage.setItem(NOTES_FAB_POS_KEY, JSON.stringify({ left, top }));
  } catch {
    /* ignore */
  }
}

function loadPanelPos(): { left: number; top: number } | null {
  try {
    const raw = sessionStorage.getItem(NOTES_PANEL_POS_KEY);
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
    sessionStorage.setItem(NOTES_PANEL_POS_KEY, JSON.stringify({ left, top }));
  } catch {
    /* ignore */
  }
}

type Props = { isDark: boolean };

export const FloatingNotes = memo(function FloatingNotes({ isDark }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>(() => {
    if (typeof window === "undefined") return { left: 24, top: 120 };
    const s = loadFabPos();
    if (s) {
      return {
        left: clamp(s.left, MARGIN, window.innerWidth - FAB - MARGIN),
        top: clamp(s.top, MARGIN, window.innerHeight - FAB - MARGIN),
      };
    }
    return { left: MARGIN + 8, top: window.innerHeight - FAB - MARGIN - 100 };
  });
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(() => {
    if (typeof window === "undefined") return null;
    const s = loadPanelPos();
    if (!s) return null;
    return {
      left: clamp(s.left, MARGIN, window.innerWidth - PANEL_W - MARGIN),
      top: clamp(s.top, MARGIN, window.innerHeight - PANEL_H - MARGIN),
    };
  });
  const [draggingFab, setDraggingFab] = useState(false);
  const [draggingPanel, setDraggingPanel] = useState(false);
  const [text, setText] = useState("");
  const fabRef = useRef({
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
    moved: false,
  });
  const panelDragRef = useRef({ startX: 0, startY: 0, originLeft: 0, originTop: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const defaultPanelPos = useMemo(() => {
    return {
      left: clamp(
        pos.left + FAB + 8,
        MARGIN,
        typeof window !== "undefined" ? window.innerWidth - PANEL_W - MARGIN : 8
      ),
      top: clamp(
        pos.top - PANEL_H + FAB + 24,
        MARGIN,
        typeof window !== "undefined" ? window.innerHeight - PANEL_H - MARGIN : 8
      ),
    };
  }, [pos.left, pos.top]);

  useEffect(() => {
    setText(loadBody());
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => saveBody(text), 400);
    return () => window.clearTimeout(t);
  }, [text]);

  useEffect(() => {
    if (!open) return;
    /* После клика по FAB среда сначала фокусирует кнопку — откладываем, чтобы каретка оказалась в textarea. */
    const t = window.setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        left: clamp(p.left, MARGIN, window.innerWidth - FAB - MARGIN),
        top: clamp(p.top, MARGIN, window.innerHeight - FAB - MARGIN),
      }));
      setPanelPos((pp) =>
        pp
          ? {
              left: clamp(pp.left, MARGIN, window.innerWidth - PANEL_W - MARGIN),
              top: clamp(pp.top, MARGIN, window.innerHeight - PANEL_H - MARGIN),
            }
          : null
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onFabPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      fabRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originLeft: pos.left,
        originTop: pos.top,
        moved: false,
      };
      setDraggingFab(true);
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - fabRef.current.startX;
        const dy = ev.clientY - fabRef.current.startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) fabRef.current.moved = true;
        setPos({
          left: clamp(fabRef.current.originLeft + dx, MARGIN, window.innerWidth - FAB - MARGIN),
          top: clamp(fabRef.current.originTop + dy, MARGIN, window.innerHeight - FAB - MARGIN),
        });
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        setDraggingFab(false);
        setPos((current) => {
          saveFabPos(current.left, current.top);
          return current;
        });
        if (!fabRef.current.moved) setOpen((o) => !o);
        fabRef.current.moved = false;
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    },
    [pos.left, pos.top]
  );

  const panelLeft = panelPos?.left ?? defaultPanelPos.left;
  const panelTop = panelPos?.top ?? defaultPanelPos.top;

  const onPanelHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      const el = e.currentTarget;
      panelDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originLeft: panelPos?.left ?? defaultPanelPos.left,
        originTop: panelPos?.top ?? defaultPanelPos.top,
      };
      setDraggingPanel(true);
      el.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - panelDragRef.current.startX;
        const dy = ev.clientY - panelDragRef.current.startY;
        setPanelPos({
          left: clamp(panelDragRef.current.originLeft + dx, MARGIN, window.innerWidth - PANEL_W - MARGIN),
          top: clamp(panelDragRef.current.originTop + dy, MARGIN, window.innerHeight - PANEL_H - MARGIN),
        });
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        setDraggingPanel(false);
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

  const tooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  const muted = isDark ? "#94a3b8" : "#64748b";
  const textC = isDark ? "#f1f5f9" : "#0f172a";
  const card = isDark ? "#0f172a" : "#f8fafc";
  const border = isDark ? "rgba(56, 189, 248, 0.15)" : "rgba(148, 163, 184, 0.35)";
  const headerBg = isDark
    ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
    : "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)";

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-label="Заметки"
          style={{
            position: "fixed",
            zIndex: 10038,
            left: panelLeft,
            top: panelTop,
            width: PANEL_W,
            maxWidth: "min(300px, calc(100vw - 20px))",
            maxHeight: `min(${PANEL_H}px, calc(100vh - 24px))`,
            display: "flex",
            flexDirection: "column",
            borderRadius: 18,
            background: card,
            color: textC,
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 20px 44px rgba(0,0,0,0.45), 0 0 0 1px rgba(251, 191, 36, 0.12)"
              : "0 16px 36px rgba(15, 23, 42, 0.1)",
            overflow: "hidden",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div
            onPointerDown={onPanelHeaderPointerDown}
            style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.25)"}`,
              background: headerBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              cursor: draggingPanel ? "grabbing" : "grab",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 14, color: isDark ? "#fde68a" : "#92400e" }}>Заметки</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              onPointerDown={(ev) => ev.stopPropagation()}
              aria-label="Закрыть"
              style={{
                border: "none",
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)",
                color: muted,
                width: 30,
                height: 30,
                borderRadius: 10,
                cursor: "pointer",
                padding: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ваши идеи, списки, напоминания…"
            style={{
              flex: 1,
              minHeight: 220,
              border: "none",
              padding: "14px 14px 16px",
              fontSize: 13,
              lineHeight: 1.5,
              fontFamily: "inherit",
              color: textC,
              background: isDark ? "rgba(15, 23, 42, 0.5)" : "#fffbeb",
              resize: "none",
              outline: "none",
              caretColor: isDark ? "#fde68a" : "#92400e",
              userSelect: "text",
            }}
          />
        </div>
      ) : null}

      <HoverTooltip
        preset={tooltipPreset}
        isDark={isDark}
        content={<span style={{ whiteSpace: "nowrap" }}>Заметки — перетащите или нажмите</span>}
        wrapperStyle={{
          position: "fixed",
          left: pos.left,
          top: pos.top,
          width: FAB,
          height: FAB,
          zIndex: 10039,
        }}
      >
        <button
          type="button"
          aria-label="Заметки — перетащите или нажмите"
          onPointerDown={onFabPointerDown}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: "none",
            cursor: draggingFab ? "grabbing" : "grab",
            padding: 0,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(145deg, #fbbf24 0%, #f59e0b 55%, #d97706 100%)",
            boxShadow: "0 10px 28px rgba(245, 158, 11, 0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
            touchAction: "none",
          }}
        >
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" aria-hidden style={{ pointerEvents: "none" }}>
            <path
              d="M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
              stroke="#fff"
              strokeWidth="1.75"
              strokeLinejoin="round"
              fill="rgba(255,255,255,0.15)"
            />
            <path d="M14 3v5h5" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 13h8M8 17h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity={0.9} />
          </svg>
        </button>
      </HoverTooltip>
    </>
  );
});
