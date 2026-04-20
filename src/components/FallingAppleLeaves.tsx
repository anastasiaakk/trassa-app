import { memo, type CSSProperties } from "react";
import styles from "./FallingAppleLeaves.module.css";

export type FallingSeason = "spring" | "summer" | "autumn" | "winter";

type PetalConfig = {
  left: string;
  dur: number;
  delay: number;
  w: number;
  h: number;
  petal: string;
  op: number;
};

const SPRING: readonly PetalConfig[] = [
  { left: "3%", dur: 40, delay: -2, w: 20, h: 26, petal: "#fff5f8", op: 0.58 },
  { left: "9%", dur: 34, delay: -20, w: 24, h: 30, petal: "#fde4ef", op: 0.52 },
  { left: "15%", dur: 46, delay: -9, w: 18, h: 24, petal: "#fff8fc", op: 0.62 },
  { left: "22%", dur: 38, delay: -26, w: 22, h: 28, petal: "#f8d4e2", op: 0.48 },
  { left: "28%", dur: 43, delay: -12, w: 21, h: 27, petal: "#fdeef5", op: 0.55 },
  { left: "35%", dur: 35, delay: -31, w: 26, h: 32, petal: "#f5c9d8", op: 0.45 },
  { left: "42%", dur: 41, delay: -6, w: 19, h: 25, petal: "#fff5f8", op: 0.56 },
  { left: "48%", dur: 37, delay: -35, w: 23, h: 29, petal: "#fce0eb", op: 0.5 },
  { left: "54%", dur: 44, delay: -15, w: 18, h: 23, petal: "#fffafd", op: 0.64 },
  { left: "61%", dur: 39, delay: -23, w: 24, h: 30, petal: "#f3b8ce", op: 0.42 },
  { left: "67%", dur: 33, delay: -8, w: 21, h: 27, petal: "#fde8f0", op: 0.54 },
  { left: "74%", dur: 42, delay: -28, w: 27, h: 34, petal: "#fad6e4", op: 0.46 },
  { left: "80%", dur: 36, delay: -10, w: 20, h: 26, petal: "#ffffff", op: 0.57 },
  { left: "86%", dur: 45, delay: -33, w: 22, h: 28, petal: "#fce4ee", op: 0.49 },
  { left: "92%", dur: 38, delay: -18, w: 19, h: 25, petal: "#fff5f9", op: 0.6 },
  { left: "96%", dur: 41, delay: -4, w: 25, h: 31, petal: "#f7c9d9", op: 0.44 },
  { left: "12%", dur: 48, delay: -38, w: 20, h: 26, petal: "#fdeef6", op: 0.51 },
  { left: "58%", dur: 35, delay: -14, w: 23, h: 29, petal: "#fff0f6", op: 0.58 },
];

const SUMMER: readonly PetalConfig[] = [
  { left: "3%", dur: 36, delay: -2, w: 22, h: 28, petal: "#c8e6c9", op: 0.52 },
  { left: "9%", dur: 32, delay: -18, w: 24, h: 30, petal: "#81c784", op: 0.48 },
  { left: "15%", dur: 40, delay: -8, w: 20, h: 26, petal: "#e8f5e9", op: 0.55 },
  { left: "22%", dur: 34, delay: -24, w: 23, h: 29, petal: "#a5d6a7", op: 0.5 },
  { left: "28%", dur: 38, delay: -11, w: 21, h: 27, petal: "#dcedc8", op: 0.52 },
  { left: "35%", dur: 33, delay: -29, w: 26, h: 32, petal: "#66bb6a", op: 0.44 },
  { left: "42%", dur: 37, delay: -5, w: 19, h: 25, petal: "#f1f8e9", op: 0.54 },
  { left: "48%", dur: 35, delay: -32, w: 24, h: 30, petal: "#9ccc65", op: 0.47 },
  { left: "54%", dur: 41, delay: -14, w: 18, h: 23, petal: "#e8f5e9", op: 0.58 },
  { left: "61%", dur: 36, delay: -21, w: 25, h: 31, petal: "#7cb342", op: 0.42 },
  { left: "67%", dur: 31, delay: -7, w: 22, h: 28, petal: "#c5e1a5", op: 0.51 },
  { left: "74%", dur: 39, delay: -26, w: 27, h: 34, petal: "#aed581", op: 0.46 },
  { left: "80%", dur: 34, delay: -9, w: 20, h: 26, petal: "#f9fbe7", op: 0.53 },
  { left: "86%", dur: 42, delay: -30, w: 23, h: 29, petal: "#8bc34a", op: 0.48 },
  { left: "92%", dur: 37, delay: -16, w: 19, h: 25, petal: "#dcedc8", op: 0.56 },
  { left: "96%", dur: 39, delay: -3, w: 24, h: 30, petal: "#689f38", op: 0.45 },
  { left: "12%", dur: 44, delay: -35, w: 21, h: 27, petal: "#e8f5e9", op: 0.5 },
  { left: "58%", dur: 33, delay: -12, w: 22, h: 28, petal: "#a5d6a7", op: 0.54 },
];

const AUTUMN: readonly PetalConfig[] = [
  { left: "3%", dur: 42, delay: -2, w: 22, h: 28, petal: "#ffcc80", op: 0.52 },
  { left: "9%", dur: 36, delay: -19, w: 24, h: 30, petal: "#d84315", op: 0.48 },
  { left: "15%", dur: 44, delay: -9, w: 20, h: 26, petal: "#fff3e0", op: 0.55 },
  { left: "22%", dur: 38, delay: -25, w: 23, h: 29, petal: "#ff8a65", op: 0.5 },
  { left: "28%", dur: 41, delay: -12, w: 21, h: 27, petal: "#bf360c", op: 0.46 },
  { left: "35%", dur: 35, delay: -30, w: 26, h: 32, petal: "#ffe0b2", op: 0.5 },
  { left: "42%", dur: 40, delay: -6, w: 19, h: 25, petal: "#e64a19", op: 0.52 },
  { left: "48%", dur: 37, delay: -33, w: 24, h: 30, petal: "#ffab91", op: 0.48 },
  { left: "54%", dur: 43, delay: -15, w: 18, h: 23, petal: "#f4511e", op: 0.54 },
  { left: "61%", dur: 38, delay: -22, w: 25, h: 31, petal: "#8d6e63", op: 0.44 },
  { left: "67%", dur: 33, delay: -8, w: 22, h: 28, petal: "#ffb74d", op: 0.51 },
  { left: "74%", dur: 41, delay: -27, w: 27, h: 34, petal: "#d84315", op: 0.47 },
  { left: "80%", dur: 36, delay: -10, w: 20, h: 26, petal: "#ffecb3", op: 0.53 },
  { left: "86%", dur: 44, delay: -31, w: 23, h: 29, petal: "#a1887f", op: 0.49 },
  { left: "92%", dur: 39, delay: -17, w: 19, h: 25, petal: "#ff7043", op: 0.55 },
  { left: "96%", dur: 41, delay: -4, w: 24, h: 30, petal: "#5d4037", op: 0.43 },
  { left: "12%", dur: 46, delay: -36, w: 21, h: 27, petal: "#ffa726", op: 0.5 },
  { left: "58%", dur: 35, delay: -13, w: 22, h: 28, petal: "#ffcc80", op: 0.54 },
];

const WINTER: readonly PetalConfig[] = [
  { left: "5%", dur: 58, delay: -4, w: 14, h: 14, petal: "#ffffff", op: 0.62 },
  { left: "12%", dur: 72, delay: -28, w: 12, h: 12, petal: "#e3f2fd", op: 0.55 },
  { left: "20%", dur: 64, delay: -12, w: 16, h: 16, petal: "#fafafa", op: 0.58 },
  { left: "28%", dur: 55, delay: -40, w: 11, h: 11, petal: "#eceff1", op: 0.52 },
  { left: "36%", dur: 68, delay: -8, w: 15, h: 15, petal: "#ffffff", op: 0.6 },
  { left: "44%", dur: 61, delay: -35, w: 13, h: 13, petal: "#e1f5fe", op: 0.54 },
  { left: "52%", dur: 75, delay: -20, w: 14, h: 14, petal: "#f5f5f5", op: 0.56 },
  { left: "60%", dur: 59, delay: -45, w: 12, h: 12, petal: "#ffffff", op: 0.61 },
  { left: "68%", dur: 66, delay: -15, w: 16, h: 16, petal: "#bbdefb", op: 0.5 },
  { left: "76%", dur: 63, delay: -32, w: 11, h: 11, petal: "#eceff1", op: 0.57 },
  { left: "84%", dur: 70, delay: -6, w: 15, h: 15, petal: "#ffffff", op: 0.59 },
  { left: "92%", dur: 56, delay: -38, w: 13, h: 13, petal: "#e8eaf6", op: 0.53 },
  { left: "8%", dur: 65, delay: -22, w: 14, h: 14, petal: "#f5f5f5", op: 0.55 },
  { left: "48%", dur: 73, delay: -48, w: 12, h: 12, petal: "#ffffff", op: 0.6 },
  { left: "88%", dur: 62, delay: -10, w: 16, h: 16, petal: "#e3f2fd", op: 0.51 },
];

const BY_SEASON: Record<FallingSeason, readonly PetalConfig[]> = {
  spring: SPRING,
  summer: SUMMER,
  autumn: AUTUMN,
  winter: WINTER,
};

function ApplePetalIcon() {
  return (
    <svg
      className={styles.petalSvg}
      viewBox="0 0 24 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 2.5c-1.2 1.8-4.5 5.2-6.2 10.5-2 6.5-1 13.5 6.2 19C19.2 26.5 20.2 19.5 18.2 13 16.5 7.7 13.2 4.3 12 2.5z"
      />
    </svg>
  );
}

function SnowflakeIcon() {
  return (
    <svg
      className={styles.snowSvg}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      >
        <path d="M12 2v20M4.5 7.5l15 9M4.5 16.5l15-9" />
        <path d="M12 2v20M4.5 7.5l15 9M4.5 16.5l15-9" transform="rotate(60 12 12)" />
        <path d="M12 2v20M4.5 7.5l15 9M4.5 16.5l15-9" transform="rotate(-60 12 12)" />
      </g>
    </svg>
  );
}

type Props = {
  season: FallingSeason;
};

function FallingAppleLeavesInner({ season }: Props) {
  const petals = BY_SEASON[season];
  const winter = season === "winter";

  return (
    <div
      className={styles.layer}
      data-season={season}
      aria-hidden
    >
      {petals.map((cfg, i) => (
        <span
          key={i}
          className={styles.track}
          style={
            {
              "--left": cfg.left,
              "--dur": `${cfg.dur}s`,
              "--delay": `${cfg.delay}s`,
              "--w": `${cfg.w}px`,
              "--h": `${cfg.h}px`,
              "--petal": cfg.petal,
              "--op": cfg.op,
            } as CSSProperties
          }
        >
          <span className={styles.inner}>
            {winter ? <SnowflakeIcon /> : <ApplePetalIcon />}
          </span>
        </span>
      ))}
    </div>
  );
}

export default memo(FallingAppleLeavesInner);
