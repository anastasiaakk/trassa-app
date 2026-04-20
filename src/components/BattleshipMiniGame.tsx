import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BS_FLEET_LENGTHS,
  BS_SIZE,
  bsFleetDestroyed,
  bsNewFleet,
  bsRandomShot,
} from "./battleshipLogic";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
};

type Phase = "player" | "ai" | "won" | "lost";

function newGameState() {
  return {
    enemyShips: bsNewFleet(),
    playerShips: bsNewFleet(),
    hitsOnEnemy: new Set<number>(),
    missOnEnemy: new Set<number>(),
    hitsOnPlayer: new Set<number>(),
    missOnPlayer: new Set<number>(),
  };
}

const CELL = 34;
const GAP = 5;

export const BattleshipMiniGame = memo(function BattleshipMiniGame({ isOpen, onClose, isDark }: Props) {
  const [st, setSt] = useState(() => newGameState());
  const [phase, setPhase] = useState<Phase>("player");

  const reset = useCallback(() => {
    setSt(newGameState());
    setPhase("player");
  }, []);

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const playerOccupied = useMemo(() => {
    const s = new Set<number>();
    for (const ship of st.playerShips) for (const c of ship) s.add(c);
    return s;
  }, [st.playerShips]);

  const firePlayer = useCallback(
    (i: number) => {
      if (phase !== "player") return;
      setSt((prev) => {
        if (prev.hitsOnEnemy.has(i) || prev.missOnEnemy.has(i)) return prev;
        const hitsOnEnemy = new Set(prev.hitsOnEnemy);
        const missOnEnemy = new Set(prev.missOnEnemy);
        const hit = prev.enemyShips.some((sh) => sh.includes(i));
        if (hit) hitsOnEnemy.add(i);
        else missOnEnemy.add(i);
        const won = bsFleetDestroyed(prev.enemyShips, hitsOnEnemy);
        queueMicrotask(() => {
          if (won) setPhase("won");
          else setPhase("ai");
        });
        return { ...prev, hitsOnEnemy, missOnEnemy };
      });
    },
    [phase]
  );

  useEffect(() => {
    if (!isOpen || phase !== "ai") return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setSt((prev) => {
        const already = new Set<number>();
        prev.hitsOnPlayer.forEach((x) => already.add(x));
        prev.missOnPlayer.forEach((x) => already.add(x));
        const target = bsRandomShot(already);
        if (target < 0) {
          queueMicrotask(() => setPhase("player"));
          return prev;
        }
        const occ = new Set(prev.playerShips.flat());
        const hit = occ.has(target);
        const hitsOnPlayer = new Set(prev.hitsOnPlayer);
        const missOnPlayer = new Set(prev.missOnPlayer);
        if (hit) hitsOnPlayer.add(target);
        else missOnPlayer.add(target);
        const lost = bsFleetDestroyed(prev.playerShips, hitsOnPlayer);
        queueMicrotask(() => {
          if (lost) setPhase("lost");
          else setPhase("player");
        });
        return { ...prev, hitsOnPlayer, missOnPlayer };
      });
    }, 1350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [isOpen, phase]);

  if (!isOpen) return null;

  const muted = isDark ? "#94a3b8" : "#64748b";
  const text = isDark ? "#f1f5f9" : "#0f172a";
  const cardBg = isDark
    ? "linear-gradient(165deg, #1e293b 0%, #0f172a 48%, #0c1222 100%)"
    : "linear-gradient(165deg, #ffffff 0%, #f8fafc 45%, #f1f5f9 100%)";
  const border = isDark ? "rgba(56, 189, 248, 0.22)" : "rgba(148, 163, 184, 0.28)";
  const accent = isDark ? "#38bdf8" : "#2563eb";

  const oceanPanel = isDark
    ? "linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 58, 95, 0.55) 100%)"
    : "linear-gradient(180deg, rgba(239, 246, 255, 0.95) 0%, rgba(219, 234, 254, 0.65) 100%)";
  const oceanBorder = isDark ? "rgba(56, 189, 248, 0.18)" : "rgba(59, 130, 246, 0.2)";
  const cellFog = isDark ? "rgba(30, 58, 95, 0.75)" : "rgba(191, 219, 254, 0.55)";
  const cellHover = isDark ? "rgba(56, 189, 248, 0.22)" : "rgba(59, 130, 246, 0.18)";
  const shipFill = isDark
    ? "linear-gradient(145deg, rgba(148, 163, 184, 0.55) 0%, rgba(71, 85, 105, 0.45) 100%)"
    : "linear-gradient(145deg, rgba(148, 163, 184, 0.5) 0%, rgba(100, 116, 139, 0.35) 100%)";
  const hitBg = isDark ? "linear-gradient(145deg, #dc2626 0%, #991b1b 100%)" : "linear-gradient(145deg, #ef4444 0%, #dc2626 100%)";
  const missBg = isDark ? "rgba(51, 65, 85, 0.75)" : "rgba(226, 232, 240, 0.95)";

  let statusText =
    "Стреляйте по верхнему полю. После выстрела отвечает Т-бот. Уничтожьте весь флот противника первым.";
  if (phase === "ai") statusText = "Т-бот прицеливается…";
  if (phase === "won") statusText = "Все вражеские корабли на дне. Победа!";
  if (phase === "lost") statusText = "Ваш флот не устоял. Удачи в следующей битве!";

  const statusTone =
    phase === "won"
      ? isDark
        ? "rgba(34, 197, 94, 0.2)"
        : "rgba(34, 197, 94, 0.12)"
      : phase === "lost"
        ? isDark
          ? "rgba(248, 113, 113, 0.15)"
          : "rgba(248, 113, 113, 0.1)"
        : isDark
          ? "rgba(56, 189, 248, 0.1)"
          : "rgba(59, 130, 246, 0.08)";

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${BS_SIZE}, ${CELL}px)`,
    gridTemplateRows: `repeat(${BS_SIZE}, ${CELL}px)`,
    gap: GAP,
    width: "fit-content",
  };

  const panelWrap: CSSProperties = {
    borderRadius: 16,
    padding: "12px 12px 14px",
    background: oceanPanel,
    border: `1px solid ${oceanBorder}`,
    boxShadow: isDark
      ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 28px rgba(0,0,0,0.35)"
      : "inset 0 1px 0 rgba(255,255,255,0.8), 0 6px 20px rgba(15, 23, 42, 0.06)",
    transition: "box-shadow 0.35s ease, border-color 0.35s ease",
  };

  const renderEnemyCell = (i: number) => {
    const hit = st.hitsOnEnemy.has(i);
    const miss = st.missOnEnemy.has(i);
    const can = phase === "player" && !hit && !miss;
    return (
      <button
        key={`e-${i}`}
        type="button"
        disabled={!can}
        onClick={() => firePlayer(i)}
        className="tbot-bs-cell tbot-bs-cell--enemy tbot-bs-cell-hint"
        data-tbot-hint={hit ? "Попадание" : miss ? "Мимо" : "Выстрел"}
        style={{
          width: CELL,
          height: CELL,
          padding: 0,
          borderRadius: 10,
          border: `1px solid ${hit || miss ? "transparent" : oceanBorder}`,
          background: hit ? hitBg : miss ? missBg : cellFog,
          cursor: can ? "crosshair" : "default",
          display: "grid",
          placeItems: "center",
          boxShadow: can
            ? `inset 0 1px 0 rgba(255,255,255,${isDark ? 0.06 : 0.5})`
            : hit
              ? "0 4px 14px rgba(220, 38, 38, 0.35)"
              : miss
                ? "inset 0 1px 2px rgba(0,0,0,0.08)"
                : undefined,
          transition:
            "transform 0.2s cubic-bezier(0.34, 1.3, 0.64, 1), box-shadow 0.25s ease, background 0.3s ease, border-color 0.2s ease",
        }}
      >
        {hit ? (
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 900, textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}>✕</span>
        ) : miss ? (
          <span style={{ color: muted, fontSize: 20, lineHeight: 1, opacity: 0.85 }}>○</span>
        ) : null}
      </button>
    );
  };

  const renderPlayerCell = (i: number) => {
    const ship = playerOccupied.has(i);
    const hit = st.hitsOnPlayer.has(i);
    const miss = st.missOnPlayer.has(i);
    return (
      <div
        key={`p-${i}`}
        className="tbot-bs-cell tbot-bs-cell-hint"
        data-tbot-hint={ship ? (hit ? "Попадание" : "Корабль") : miss ? "Мимо" : "Вода"}
        style={{
          width: CELL,
          height: CELL,
          borderRadius: 10,
          border: `1px solid ${oceanBorder}`,
          background: hit ? hitBg : ship ? shipFill : cellFog,
          display: "grid",
          placeItems: "center",
          boxShadow: hit
            ? "0 4px 14px rgba(220, 38, 38, 0.35)"
            : ship
              ? "inset 0 1px 0 rgba(255,255,255,0.12)"
              : "inset 0 1px 2px rgba(0,0,0,0.04)",
          transition: "background 0.3s ease, box-shadow 0.25s ease",
        }}
      >
        {miss ? (
          <span style={{ color: muted, fontSize: 18, lineHeight: 1, opacity: 0.75 }}>·</span>
        ) : hit ? (
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 900, textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}>✕</span>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes tbot-bs-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tbot-bs-card-in {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes tbot-bs-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.35); }
          50% { box-shadow: 0 0 0 6px rgba(56, 189, 248, 0); }
        }
        .tbot-bs-root {
          animation: tbot-bs-backdrop-in 0.35s ease forwards;
        }
        .tbot-bs-card {
          animation: tbot-bs-card-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .tbot-bs-cell--enemy:not(:disabled):hover {
          transform: scale(1.06);
          background: ${cellHover} !important;
          box-shadow: 0 6px 18px rgba(56, 189, 248, 0.22), inset 0 1px 0 rgba(255,255,255,${isDark ? 0.08 : 0.45}) !important;
        }
        .tbot-bs-cell--enemy:not(:disabled):active {
          transform: scale(0.96);
          transition-duration: 0.08s;
        }
        .tbot-bs-cell--enemy:disabled {
          transform: none;
        }
        .tbot-bs-ai-panel {
          ${phase === "ai" ? `animation: tbot-bs-pulse-ring 1.4s ease-in-out infinite;` : ""}
        }
        .tbot-bs-cell-hint {
          position: relative;
        }
        .tbot-bs-cell-hint[data-tbot-hint]::after {
          content: attr(data-tbot-hint);
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          padding: 9px 13px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.35;
          white-space: nowrap;
          z-index: 30;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: ${
            isDark
              ? "0 18px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(56, 189, 248, 0.15)"
              : "0 14px 32px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(255,255,255,0.95) inset"
          };
          border: ${isDark ? "1px solid rgba(56, 189, 248, 0.28)" : "1px solid rgba(59, 130, 246, 0.2)"};
          background: ${
            isDark
              ? "linear-gradient(160deg, rgba(30, 58, 95, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)"
              : "linear-gradient(160deg, #ffffff 0%, #f1f5f9 100%)"
          };
          color: ${isDark ? "#f8fafc" : "#0f172a"};
          backdrop-filter: blur(12px);
        }
        .tbot-bs-cell-hint[data-tbot-hint]:hover::after {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>
      <div
        role="dialog"
        aria-modal
        aria-label="Морской бой с Т-ботом"
        className="tbot-bs-root"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10050,
          display: "grid",
          placeItems: "center",
          padding: 16,
          background: isDark ? "rgba(15, 23, 42, 0.62)" : "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(10px) saturate(1.2)",
          WebkitBackdropFilter: "blur(10px) saturate(1.2)",
          overflow: "auto",
        }}
        onClick={onClose}
      >
        <div
          className="tbot-bs-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(400px, calc(100vw - 32px))",
            maxHeight: "min(92vh, 760px)",
            overflowY: "auto",
            borderRadius: 22,
            padding: "18px 18px 20px",
            background: cardBg,
            color: text,
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 28px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(56, 189, 248, 0.06) inset"
              : "0 24px 48px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(255,255,255,0.9) inset",
            fontFamily: "Inter, system-ui, sans-serif",
            position: "relative",
            userSelect: "none",
            caretColor: "transparent",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: "12%",
              right: "12%",
              height: 3,
              borderRadius: "0 0 8px 8px",
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              opacity: 0.65,
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              paddingTop: 4,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: "-0.03em",
                background: isDark
                  ? "linear-gradient(90deg, #f1f5f9, #7dd3fc)"
                  : "linear-gradient(90deg, #0f172a, #2563eb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Морской бой
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть игру"
              style={{
                border: `1px solid ${border}`,
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
                color: muted,
                width: 36,
                height: 36,
                borderRadius: 12,
                cursor: "pointer",
                padding: 0,
                display: "grid",
                placeItems: "center",
                transition: "transform 0.2s ease, background 0.2s ease, border-color 0.2s ease",
                boxShadow: isDark ? "none" : "0 1px 3px rgba(15,23,42,0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.1)" : "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)";
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div
            style={{
              marginBottom: 14,
              padding: "11px 14px",
              borderRadius: 14,
              background: statusTone,
              border: `1px solid ${phase === "won" || phase === "lost" ? "transparent" : oceanBorder}`,
              transition: "background 0.4s ease, border-color 0.3s ease",
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: text, lineHeight: 1.5, fontWeight: 500 }}>{statusText}</p>
          </div>

          <p
            style={{
              margin: "0 0 14px",
              fontSize: 11,
              color: muted,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Корабли: {BS_FLEET_LENGTHS.join(" · ")} клеток · поле {BS_SIZE}×{BS_SIZE}
          </p>

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                marginBottom: 8,
                color: muted,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${accent}, #818cf8)`,
                  boxShadow: `0 0 10px ${accent}66`,
                }}
              />
              Противник
            </div>
            <div className={phase === "ai" ? "tbot-bs-ai-panel" : undefined} style={panelWrap}>
              <div style={gridStyle}>{Array.from({ length: BS_SIZE * BS_SIZE }, (_, i) => renderEnemyCell(i))}</div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                marginBottom: 8,
                color: muted,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isDark ? "rgba(148, 163, 184, 0.8)" : "rgba(100, 116, 139, 0.7)",
                }}
              />
              Ваш флот
            </div>
            <div style={panelWrap}>
              <div style={gridStyle}>{Array.from({ length: BS_SIZE * BS_SIZE }, (_, i) => renderPlayerCell(i))}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            disabled={phase === "ai"}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 14,
              padding: "12px 16px",
              fontWeight: 700,
              fontSize: 14,
              cursor: phase === "ai" ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: phase === "ai" ? 0.55 : 1,
              color: "#f8fafc",
              background: `linear-gradient(145deg, ${accent} 0%, #4f46e5 100%)`,
              boxShadow:
                phase === "ai"
                  ? "none"
                  : isDark
                    ? "0 8px 24px rgba(56, 189, 248, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
                    : "0 8px 22px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255,255,255,0.25)",
              transition: "transform 0.2s ease, box-shadow 0.25s ease, opacity 0.3s ease",
            }}
            onMouseEnter={(e) => {
              if (phase === "ai") return;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = isDark
                ? "0 12px 28px rgba(56, 189, 248, 0.35), inset 0 1px 0 rgba(255,255,255,0.15)"
                : "0 12px 28px rgba(37, 99, 235, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                phase === "ai"
                  ? "none"
                  : isDark
                    ? "0 8px 24px rgba(56, 189, 248, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
                    : "0 8px 22px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255,255,255,0.25)";
            }}
          >
            Новая игра
          </button>
        </div>
      </div>
    </>
  );
});
