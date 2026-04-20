import { memo, useId, type CSSProperties } from "react";
import { DEFAULT_TBOT_APPEARANCE, type TBotAppearance } from "./tbotAppearance";

export type TBotMood = "neutral" | "happy" | "thinking" | "talking" | "curious" | "worried";

const MOOD_LABEL: Record<TBotMood, string> = {
  neutral: "стабильный режим",
  happy: "хорошее настроение",
  thinking: "обрабатываю…",
  talking: "передаю ответ",
  curious: "интересуюсь",
  worried: "сбой связи",
};

export function getTBotMoodLabel(mood: TBotMood): string {
  return MOOD_LABEL[mood];
}

function mergeAppearance(p?: Partial<TBotAppearance>): TBotAppearance {
  return { ...DEFAULT_TBOT_APPEARANCE, ...p };
}

const ANTENNA_BALL = "#f472b6";

type Props = {
  mood: TBotMood;
  size?: number;
  /** Лёгкое покачивание (плавающая кнопка) */
  withFloat?: boolean;
  /** Аксессуары */
  appearance?: Partial<TBotAppearance>;
};

export const TBotMascot = memo(function TBotMascot({
  mood,
  size = 40,
  withFloat = false,
  appearance: appearanceProp,
}: Props) {
  const appearance = mergeAppearance(appearanceProp);
  const gradId = useId().replace(/:/g, "");
  const crownGradId = useId().replace(/:/g, "");

  const palette =
    mood === "happy"
      ? { body: "#3b82f6", plate: "#22d3ee", eye: "#fef08a", glow: "rgba(34, 211, 238, 0.55)" }
      : mood === "thinking"
        ? { body: "#52525b", plate: "#a78bfa", eye: "#c4b5fd", glow: "rgba(167, 139, 250, 0.45)" }
        : mood === "talking"
          ? { body: "#2563eb", plate: "#38bdf8", eye: "#fde047", glow: "rgba(250, 204, 21, 0.4)" }
          : mood === "curious"
            ? { body: "#4f46e5", plate: "#818cf8", eye: "#a5f3fc", glow: "rgba(129, 140, 248, 0.5)" }
            : mood === "worried"
              ? { body: "#57534e", plate: "#78716c", eye: "#fca5a5", glow: "rgba(248, 113, 113, 0.35)" }
              : { body: "#475569", plate: "#38bdf8", eye: "#67e8f9", glow: "rgba(56, 189, 248, 0.35)" };

  const mouthWide = mood === "talking" || mood === "happy";
  const eyeSquint = mood === "happy";
  const eyeRy = mood === "worried" ? 2.5 : 4;

  return (
    <div
      className={`tbot-mascot-root${withFloat ? " tbot-mascot-float" : ""}`}
      data-mood={mood}
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes tbot-float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes tbot-antenna-wiggle {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes tbot-antenna-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes tbot-blink {
          0%, 48%, 52%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.12); }
        }
        @keyframes tbot-mouth-pulse {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.12); }
        }
        @keyframes tbot-glow-pulse {
          0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 3px var(--tbot-glow)); }
          50% { opacity: 1; filter: drop-shadow(0 0 9px var(--tbot-glow)); }
        }
        .tbot-mascot-float {
          animation: tbot-float-y 2.8s ease-in-out infinite;
        }
        .tbot-mascot-root[data-mood="thinking"] .tbot-antenna-group {
          animation: tbot-antenna-spin 1.1s linear infinite;
          transform-origin: 32px 9px;
        }
        .tbot-mascot-root[data-mood="happy"] .tbot-antenna-group,
        .tbot-mascot-root[data-mood="curious"] .tbot-antenna-group {
          animation: tbot-antenna-wiggle 2s ease-in-out infinite;
          transform-origin: 32px 9px;
        }
        .tbot-mascot-root[data-mood="talking"] .tbot-mouth {
          animation: tbot-mouth-pulse 0.42s ease-in-out infinite;
          transform-origin: 32px 54px;
        }
        .tbot-mascot-root[data-mood="talking"] .tbot-svg-node {
          animation: tbot-glow-pulse 0.9s ease-in-out infinite;
        }
        .tbot-eye-node {
          transform-origin: center;
          transform-box: fill-box;
          animation: tbot-blink 4.2s ease-in-out infinite;
        }
      `}</style>
      <svg
        className="tbot-svg-node"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        style={{ display: "block", ["--tbot-glow" as string]: palette.glow } as CSSProperties}
      >
        <defs>
          <linearGradient id={gradId} x1="12" y1="18" x2="52" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor={palette.body} />
            <stop offset="1" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id={crownGradId} x1="32" y1="5" x2="32" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fde047" />
            <stop offset="0.55" stopColor="#facc15" />
            <stop offset="1" stopColor="#ca8a04" />
          </linearGradient>
        </defs>

        <g className="tbot-antenna-group">
          <line x1="32" y1="14" x2="32" y2="7" stroke={palette.plate} strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="4.5" r="4" fill={ANTENNA_BALL} stroke="#fda4af" strokeWidth="1.5" />
        </g>

        <rect x="10" y="16" width="44" height="40" rx="12" fill={`url(#${gradId})`} stroke={palette.plate} strokeWidth="2" />

        {appearance.accessory === "crown" ? (
          <g>
            <path
              d="M 11 21.5 L 15.5 7.5 L 20 14.5 L 24.5 5 L 29 12 L 32 6.5 L 35 12 L 39.5 5 L 44 14.5 L 48.5 7.5 L 53 21.5 L 53 23.5 L 11 23.5 Z"
              fill={`url(#${crownGradId})`}
              stroke="#b45309"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            <path
              d="M 13 21.5 Q 32 19 51 21.5"
              fill="none"
              stroke="#fde68a"
              strokeWidth="0.9"
              strokeOpacity={0.65}
            />
          </g>
        ) : null}

        {appearance.accessory === "headphones" ? (
          <g stroke="#64748b" strokeWidth="2" fill="#334155">
            <path
              d="M6 30 Q6 18 18 15 Q32 12 46 15 Q58 18 58 30"
              fill="none"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <rect x="1" y="27" width="7" height="13" rx="2" />
            <rect x="56" y="27" width="7" height="13" rx="2" />
          </g>
        ) : null}

        <rect x="18" y="38" width="28" height="14" rx="4" fill={palette.plate} opacity={0.38} />

        <text
          x="32"
          y="48.5"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="11"
          fontWeight={800}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: "none" }}
        >
          Т
        </text>

        {eyeSquint ? (
          <>
            <path
              className="tbot-eye-node"
              d="M20 29 Q24 26 28 29"
              stroke={palette.eye}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="tbot-eye-node"
              d="M36 29 Q40 26 44 29"
              stroke={palette.eye}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <ellipse className="tbot-eye-node" cx="24" cy="30" rx="4" ry={eyeRy} fill={palette.eye} />
            <ellipse className="tbot-eye-node" cx="40" cy="30" rx="4" ry={eyeRy} fill={palette.eye} />
          </>
        )}

        {mouthWide ? (
          <rect className="tbot-mouth" x="24" y="52" width="16" height="5" rx="2" fill="#fbbf24" opacity={0.95} />
        ) : (
          <rect className="tbot-mouth" x="26" y="53" width="12" height="3" rx="1.5" fill="#94a3b8" />
        )}

        {appearance.accessory === "glasses" ? (
          <g stroke={palette.plate} strokeWidth="1.6" fill="none">
            <circle cx="24" cy="30" r="5" />
            <circle cx="40" cy="30" r="5" />
            <path d="M29 30 H35" strokeLinecap="round" />
            <path d="M19 30 H17" strokeLinecap="round" />
            <path d="M45 30 H47" strokeLinecap="round" />
          </g>
        ) : null}

        {appearance.accessory === "starGlasses" ? (
          <g stroke="#facc15" strokeWidth="1.35" fill="rgba(254, 249, 195, 0.12)" strokeLinejoin="round">
            <path
              transform="translate(24, 30)"
              d="M0 -4.8 L1.35 -1.35 L4.8 0 L1.35 1.35 L0 4.8 L-1.35 1.35 L-4.8 0 L-1.35 -1.35 Z"
            />
            <path
              transform="translate(40, 30)"
              d="M0 -4.8 L1.35 -1.35 L4.8 0 L1.35 1.35 L0 4.8 L-1.35 1.35 L-4.8 0 L-1.35 -1.35 Z"
            />
            <path d="M28.5 30 H35.5" strokeLinecap="round" />
            <path d="M19 30 H16.5" strokeLinecap="round" />
            <path d="M47.5 30 H45" strokeLinecap="round" />
          </g>
        ) : null}

        <rect x="6" y="22" width="4" height="10" rx="2" fill="#64748b" />
        <rect x="54" y="22" width="4" height="10" rx="2" fill="#64748b" />
      </svg>
    </div>
  );
});
