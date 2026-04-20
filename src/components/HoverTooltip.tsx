import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function getHoverTooltipPreset(isDark: boolean) {
  return isDark
    ? {
        panelBg:
          "linear-gradient(160deg, rgba(30, 58, 95, 0.96) 0%, rgba(30, 41, 59, 0.98) 42%, rgba(15, 23, 42, 0.99) 100%)",
        color: "#f8fafc",
        border: "rgba(56, 189, 248, 0.32)",
        shadow:
          "0 22px 50px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(56, 189, 248, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.07)",
        arrowFill: "#1e3a5f",
      }
    : {
        panelBg: "linear-gradient(160deg, #ffffff 0%, #f1f5f9 38%, #e2e8f0 100%)",
        color: "#0f172a",
        border: "rgba(59, 130, 246, 0.22)",
        shadow:
          "0 16px 40px rgba(15, 23, 42, 0.1), 0 4px 12px rgba(37, 99, 235, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.95) inset",
        arrowFill: "#e2e8f0",
      };
}

type Preset = ReturnType<typeof getHoverTooltipPreset>;

type Props = {
  content: ReactNode;
  children: ReactNode;
  preset: Preset;
  isDark: boolean;
  wrapperStyle?: CSSProperties;
  disabled?: boolean;
  /** Показ подсказки только после удержания курсора (мс). 0 — как раньше, сразу. */
  showDelayMs?: number;
};

export function HoverTooltip({
  content,
  children,
  preset,
  isDark,
  wrapperStyle,
  disabled,
  showDelayMs = 0,
}: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLSpanElement>(null);
  const delayTimerRef = useRef<number | null>(null);

  const clearDelayTimer = useCallback(() => {
    if (delayTimerRef.current != null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.top, left: r.left + r.width / 2 });
  }, []);

  const reveal = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setOpen(true);
  }, [disabled, updatePosition]);

  const onMouseEnter = useCallback(() => {
    if (disabled) return;
    clearDelayTimer();
    if (showDelayMs <= 0) {
      reveal();
      return;
    }
    delayTimerRef.current = window.setTimeout(() => {
      delayTimerRef.current = null;
      reveal();
    }, showDelayMs);
  }, [disabled, showDelayMs, clearDelayTimer, reveal]);

  const hide = useCallback(() => {
    clearDelayTimer();
    setOpen(false);
  }, [clearDelayTimer]);

  useEffect(() => () => clearDelayTimer(), [clearDelayTimer]);

  /** Фокус с клавиатуры — без задержки. */
  const onFocusReveal = useCallback(() => {
    if (disabled) return;
    clearDelayTimer();
    reveal();
  }, [disabled, clearDelayTimer, reveal]);

  const tooltip =
    open &&
    !disabled &&
    createPortal(
      <div
        role="tooltip"
        style={{
          position: "fixed",
          zIndex: 10050,
          top: coords.top,
          left: coords.left,
          transform: "translate(-50%, calc(-100% - 12px))",
          pointerEvents: "none",
          caretColor: "transparent",
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "relative",
            animation: "hover-tooltip-pop 0.22s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <div
            style={{
              position: "relative",
              padding: "13px 17px 13px 15px",
              borderRadius: 18,
              background: preset.panelBg,
              color: preset.color,
              border: `1px solid ${preset.border}`,
              boxShadow: preset.shadow,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.5,
              maxWidth: "min(300px, calc(100vw - 24px))",
              textAlign: "left",
              overflow: "hidden",
              caretColor: "transparent",
              userSelect: "none",
            }}
          >
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                borderRadius: "18px 0 0 18px",
                background: isDark
                  ? "linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)"
                  : "linear-gradient(180deg, #3b82f6 0%, #6366f1 100%)",
                opacity: 0.95,
              }}
            />
            <span style={{ position: "relative", zIndex: 1, display: "block" }}>{content}</span>
          </div>
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              bottom: -6,
              marginLeft: -6,
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: `7px solid ${preset.arrowFill}`,
              filter: isDark ? "drop-shadow(0 2px 2px rgba(0,0,0,0.25))" : "drop-shadow(0 1px 1px rgba(15,23,42,0.08))",
            }}
          />
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <span
        ref={wrapRef}
        style={{
          display: "inline-flex",
          alignItems: "center",
          maxWidth: "100%",
          ...wrapperStyle,
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={hide}
        onFocus={onFocusReveal}
        onBlur={hide}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
