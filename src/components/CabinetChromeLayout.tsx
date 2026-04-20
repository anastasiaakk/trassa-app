import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ProfileSettingsData } from "../profileSettingsStorage";
import { loadCabinetTheme, loadProfileSettings, saveCabinetTheme } from "../profileSettingsStorage";
import { AiChatBubble } from "./AiChatBubble";
import { getHoverTooltipPreset, HoverTooltip } from "./HoverTooltip";
import { Page5MessengerView } from "../pages/Page5MessengerView";
import { injectImagePreloads } from "../utils/imagePreload";
import { ensureMessengerUidInProfile } from "../utils/messengerInvite";
import { isMessengerHiddenForMe } from "../utils/messengerHiddenForMe";
import {
  applyMessengerInvitePayload,
  decodeMessengerInvite,
  MSGR_INVITE_PARAM,
} from "../utils/messengerInvite";
import {
  ADMIN_CABINET_SEARCH,
  clearAdminReturnMark,
  shouldShowReturnToAdminDashboard,
} from "../utils/adminReturnNavigation";

export type CabinetSection = "dashboard" | "messenger";

const MSGR_SEEN_KEY = "trassa-msgr-seen";

function readMessengerSeenAt(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const n = Number(localStorage.getItem(MSGR_SEEN_KEY));
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* ignore */
  }
  return Date.now();
}

function scanMessengerInboxUnread(seenAt: number): boolean {
  const myUid = ensureMessengerUidInProfile();
  try {
    const raw = localStorage.getItem("trassa-messenger-v1");
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<
      string,
      Array<{ author: string; createdAt: string; id?: string }>
    >;
    for (const tid of Object.keys(data)) {
      for (const m of data[tid] ?? []) {
        if (m.author !== myUid && new Date(m.createdAt).getTime() > seenAt) {
          if (m.id && isMessengerHiddenForMe(tid, m.id)) continue;
          return true;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

const MESSENGER_STORE_KEY = "trassa-messenger-v1";
const MESSENGER_PEERS_KEY = "trassa-messenger-peers-v1";

function injectMessengerTestIncoming(): void {
  try {
    let peerId = "p1";
    const pr = localStorage.getItem(MESSENGER_PEERS_KEY);
    if (pr) {
      const peers = JSON.parse(pr) as Array<{ id: string }>;
      if (Array.isArray(peers) && peers[0]?.id) peerId = peers[0].id;
    }
    const raw = localStorage.getItem(MESSENGER_STORE_KEY);
    const data = (raw ? JSON.parse(raw) : {}) as Record<
      string,
      Array<{ id: string; threadId: string; author: string; text: string; createdAt: string }>
    >;
    const arr = data[peerId] ?? [];
    const msg = {
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      threadId: peerId,
      author: peerId,
      text: "Привет! Это тестовое входящее — проверка индикатора на иконке мессенджера.",
      createdAt: new Date().toISOString(),
    };
    data[peerId] = [...arr, msg];
    localStorage.setItem(MESSENGER_STORE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
  } catch {
    /* ignore */
  }
}

const ROLES_GRID_ICON =
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/ujfy3mdv_expires_30_days.png";

/** Общие изображения кабинета (шапка, герой, иконки) — как в кабинете подрядчика */
export const CABINET_CHROME_PRELOAD_IMAGES = [
  ROLES_GRID_ICON,
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/nbc1yabw_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/w5oazpzp_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/k21ztar3_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/uz9yxbza_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/u4te4tx0_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/ac7lp2lp_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/2fiff9mo_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/of5s9282_expires_30_days.png",
] as const;

export type CabinetChromeStyles = {
  pageBg: string;
  text: string;
  muted: string;
  surfaceBg: string;
  cardBg: string;
  sectionBg: string;
  inputBg: string;
  buttonBg: string;
  buttonText: string;
  cardShadow: string;
  insetShadow: string;
};

export type CabinetChromeContext = {
  styles: CabinetChromeStyles;
  layoutStyles: Record<string, CSSProperties>;
  isDark: boolean;
  profilePlaque: ProfileSettingsData;
  plaqueName: string;
};

type Props = {
  cabinetPath: string;
  children: (ctx: CabinetChromeContext) => ReactNode;
};

function CabinetChromeLayout({ cabinetPath, children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => loadCabinetTheme());
  const [profilePlaque, setProfilePlaque] = useState(() => loadProfileSettings());
  const [cabinetSection, setCabinetSection] = useState<CabinetSection>("dashboard");
  const [messengerSeenAt, setMessengerSeenAt] = useState(() => readMessengerSeenAt());
  const [messengerHasUnread, setMessengerHasUnread] = useState(() =>
    typeof window !== "undefined" ? scanMessengerInboxUnread(readMessengerSeenAt()) : false
  );
  const [messengerMountKey, setMessengerMountKey] = useState(0);
  const messengerEnabled = cabinetPath !== "/cabinet-school" && cabinetPath !== "/cabinet-spo";

  const isDark = theme === "dark";

  const sidebarTooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  const styles = useMemo(
    () => ({
      pageBg: isDark ? "#0f172a" : "#e8edf5",
      text: isDark ? "#f8fafc" : "#1c2b45",
      muted: isDark ? "#a9bfe0" : "#5f728f",
      surfaceBg: isDark ? "#1c2b45" : "#f8fafc",
      cardBg: isDark ? "#16202f" : "#edf3fb",
      sectionBg: isDark ? "#1b2c47" : "#f7faff",
      inputBg: isDark ? "#172636" : "#eef3f8",
      buttonBg: "#243b74",
      buttonText: "#f8fafc",
      cardShadow: isDark
        ? "20px 20px 40px rgba(0, 0, 0, 0.35)"
        : "20px 20px 40px rgba(142, 154, 178, 0.16), -20px -20px 40px rgba(255, 255, 255, 0.9)",
      insetShadow: isDark
        ? "inset 8px 8px 18px rgba(0, 0, 0, 0.24)"
        : "inset 8px 8px 18px rgba(142, 154, 178, 0.16), inset -8px -8px 18px rgba(255, 255, 255, 0.8)",
    }),
    [isDark]
  );

  useEffect(() => {
    saveCabinetTheme(theme);
  }, [theme]);

  useEffect(() => {
    const syncProfile = () => setProfilePlaque(loadProfileSettings());
    window.addEventListener("trassa-profile-saved", syncProfile);
    window.addEventListener("focus", syncProfile);
    return () => {
      window.removeEventListener("trassa-profile-saved", syncProfile);
      window.removeEventListener("focus", syncProfile);
    };
  }, []);

  useEffect(() => {
    return injectImagePreloads([...CABINET_CHROME_PRELOAD_IMAGES]);
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = styles.pageBg;
  }, [styles.pageBg]);

  const recalcMessengerBadge = useCallback(() => {
    if (!messengerEnabled) {
      setMessengerHasUnread(false);
      return;
    }
    if (cabinetSection === "messenger") {
      setMessengerHasUnread(false);
      return;
    }
    setMessengerHasUnread(scanMessengerInboxUnread(messengerSeenAt));
  }, [cabinetSection, messengerSeenAt, messengerEnabled]);

  useEffect(() => {
    recalcMessengerBadge();
  }, [recalcMessengerBadge]);

  useEffect(() => {
    if (!messengerEnabled) return;
    const onUpd = () => recalcMessengerBadge();
    window.addEventListener("trassa-messenger-updated", onUpd);
    return () => window.removeEventListener("trassa-messenger-updated", onUpd);
  }, [recalcMessengerBadge, messengerEnabled]);

  useEffect(() => {
    if (!messengerEnabled) return;
    if (cabinetSection !== "messenger") return;
    const t = Date.now();
    try {
      localStorage.setItem(MSGR_SEEN_KEY, String(t));
    } catch {
      /* ignore */
    }
    setMessengerSeenAt(t);
    setMessengerHasUnread(false);
  }, [cabinetSection, messengerEnabled]);

  useEffect(() => {
    if (!messengerEnabled) return;
    const sp = new URLSearchParams(location.search);
    const t = sp.get(MSGR_INVITE_PARAM);
    if (!t) return;
    const data = decodeMessengerInvite(t);
    if (!data) {
      navigate({ pathname: location.pathname, search: "" }, { replace: true });
      return;
    }
    applyMessengerInvitePayload(data);
    setCabinetSection("messenger");
    setMessengerMountKey((k) => k + 1);
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
  }, [location.search, location.pathname, navigate, messengerEnabled]);

  useEffect(() => {
    if (messengerEnabled) return;
    if (cabinetSection === "messenger") {
      setCabinetSection("dashboard");
    }
  }, [messengerEnabled, cabinetSection]);

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const goToProfile = useCallback(() => {
    navigate("/profile", { state: { from: location.pathname } });
  }, [navigate, location.pathname]);

  const goToRoleSelection = useCallback(() => {
    clearAdminReturnMark();
    navigate("/page3");
  }, [navigate]);

  const goToAdminCabinet = useCallback(() => {
    navigate({ pathname: "/services", search: `?${ADMIN_CABINET_SEARCH}` });
  }, [navigate]);

  const plaqueName = profilePlaque.firstName.trim() || "Пользователь";

  const mainRegion = useMemo(
    () => ({
      flex: 1,
      minHeight: 0,
      width: "100%",
      display: "flex" as const,
      flexDirection: "column" as const,
      boxSizing: "border-box" as const,
    }),
    []
  );

  const layoutStyles = useMemo<Record<string, CSSProperties>>(
    () => ({
      root: {
        minHeight: "100vh",
        background: styles.pageBg,
        color: styles.text,
        fontFamily: "Inter, sans-serif",
        padding: 24,
        transition: "background 0.35s ease, color 0.35s ease",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      },
      container: {
        maxWidth: 1400,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        flex: 1,
        minHeight: 0,
        width: "100%",
      },
      main: {
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: 28,
        alignItems: "start",
      },
      aside: {
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: 28,
        borderRadius: 32,
        background: styles.sectionBg,
        boxShadow: styles.cardShadow,
      },
      sideCard: {
        borderRadius: 32,
        background: styles.cardBg,
        padding: 24,
        boxShadow: styles.cardShadow,
        color: styles.text,
      },
      sideBlock: {
        width: "100%",
        borderRadius: 32,
        padding: "20px",
        background: styles.inputBg,
        border: "1px solid rgba(255,255,255,0.7)",
        color: styles.text,
        textAlign: "left",
        cursor: "pointer",
        boxShadow: styles.insetShadow,
      },
      section: { display: "flex", flexDirection: "column", gap: 24, minWidth: 0 },
      heroCard: {
        borderRadius: 32,
        overflow: "hidden",
        minHeight: 380,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 28,
        backgroundImage:
          "linear-gradient(180deg, rgba(" +
          (isDark ? "15,23,42,0.65" : "46,69,108,0.55") +
          ") 0%, rgba(" +
          (isDark ? "15,23,42,0.65" : "34,56,88,0.55") +
          ") 100%), url('https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/nbc1yabw_expires_30_days.png')",
        backgroundSize: "115%",
        backgroundPosition: "center 40%",
        filter: "brightness(1.08)",
        boxShadow: styles.cardShadow,
        color: "#ffffff",
      },
      heroTag: {
        background: "rgba(255,255,255,0.16)",
        border: "1px solid rgba(255,255,255,0.24)",
        color: "#ffffff",
        borderRadius: 9999,
        padding: "10px 18px",
        cursor: "pointer",
      },
      heroButton: {
        background: "#ffffff",
        border: "none",
        borderRadius: 9999,
        padding: 12,
        cursor: "pointer",
      },
      heroTitle: {
        fontSize: 42,
        fontWeight: 800,
        lineHeight: 1.05,
        maxWidth: 520,
        color: "#ffffff",
      },
      heroTitleEmpty: {
        fontSize: 22,
        fontWeight: 600,
        lineHeight: 1.2,
        maxWidth: 480,
        color: "rgba(255,255,255,0.72)",
      },
      infoCard: {
        borderRadius: 32,
        padding: 26,
        background: styles.cardBg,
        boxShadow: styles.cardShadow,
        color: styles.text,
      },
      infoLabel: {
        fontSize: 12,
        color: styles.muted,
        marginBottom: 12,
      },
      infoTitle: {
        fontSize: 28,
        fontWeight: 800,
        marginBottom: 12,
      },
      infoText: {
        fontSize: 14,
        color: styles.muted,
        lineHeight: 1.7,
      },
      actionCard: {
        width: "100%",
        borderRadius: 32,
        padding: "22px",
        background: isDark ? "#172636" : "#eef3fb",
        border: "1px solid rgba(255,255,255,0.8)",
        cursor: "pointer",
        textAlign: "left",
        boxShadow: styles.insetShadow,
        color: styles.text,
      },
      recentPanel: {
        borderRadius: 32,
        padding: 28,
        background: styles.cardBg,
        boxShadow: styles.cardShadow,
        display: "grid",
        gap: 22,
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #d9e2f1",
      },
      recentTitle: {
        fontSize: 22,
        fontWeight: 800,
        color: styles.text,
      },
    }),
    [styles, isDark]
  );

  const ctx = useMemo<CabinetChromeContext>(
    () => ({
      styles,
      layoutStyles,
      isDark,
      profilePlaque,
      plaqueName,
    }),
    [styles, layoutStyles, isDark, profilePlaque, plaqueName]
  );

  return (
    <div style={layoutStyles.root}>
      <div style={layoutStyles.container}>
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 20,
            padding: "24px 28px",
            borderRadius: 32,
            background: styles.surfaceBg,
            boxShadow: styles.cardShadow,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            {shouldShowReturnToAdminDashboard() ? (
              <button
                type="button"
                onClick={goToAdminCabinet}
                style={{
                  border: "1px solid rgba(36, 59, 116, 0.35)",
                  background: styles.sectionBg,
                  color: styles.text,
                  borderRadius: 22,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: styles.insetShadow,
                  whiteSpace: "nowrap",
                }}
              >
                ← Кабинет администратора
              </button>
            ) : null}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 22,
                background: styles.sectionBg,
                boxShadow: styles.insetShadow,
                minWidth: 200,
                height: 38,
              }}
            >
              <img
                decoding="async"
                src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/w5oazpzp_expires_30_days.png"
                alt=""
                style={{ width: 18, height: 18 }}
              />
              <input
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Поиск…"
                style={{
                  width: 140,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: styles.text,
                  fontSize: 14,
                  lineHeight: "18px",
                  height: "100%",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              decoding="async"
              fetchPriority="high"
              src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/k21ztar3_expires_30_days.png"
              alt="Логотип"
              style={{ width: 160, height: 26, objectFit: "contain" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16 }}>
            {messengerEnabled ? (
              <HoverTooltip
                preset={sidebarTooltipPreset}
                isDark={isDark}
                content={
                  <span style={{ whiteSpace: "nowrap" }}>
                    {cabinetSection === "messenger"
                      ? "Свернуть мессенджер"
                      : messengerHasUnread
                        ? "Открыть мессенджер — есть непрочитанные"
                        : "Открыть мессенджер"}
                  </span>
                }
              >
                <div style={{ position: "relative", display: "inline-flex" }}>
                  <button
                    type="button"
                    onClick={() =>
                      setCabinetSection((prev) => (prev === "messenger" ? "dashboard" : "messenger"))
                    }
                    aria-label="Мессенджер"
                    style={{
                      border: "none",
                      background:
                        cabinetSection === "messenger"
                          ? isDark
                            ? "rgba(79, 128, 243, 0.35)"
                            : "rgba(36, 59, 116, 0.92)"
                          : styles.buttonBg,
                      padding: 12,
                      borderRadius: "50%",
                      cursor: "pointer",
                      boxShadow:
                        cabinetSection === "messenger"
                          ? `${styles.insetShadow}, 0 0 0 2px rgba(79, 128, 243, 0.65)`
                          : styles.insetShadow,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                        stroke="#f8fafc"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {messengerHasUnread && cabinetSection !== "messenger" ? (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#f87171",
                        boxShadow: isDark
                          ? "0 0 0 2px #1c2b45, 0 2px 6px rgba(0,0,0,0.4)"
                          : "0 0 0 2px #f8fafc, 0 2px 6px rgba(15,23,42,0.2)",
                        pointerEvents: "none",
                      }}
                    />
                  ) : null}
                </div>
              </HoverTooltip>
            ) : null}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px 10px 12px",
                borderRadius: 22,
                background: isDark
                  ? "linear-gradient(145deg, #1e3a5f 0%, #14263b 52%, #0f1f38 100%)"
                  : "linear-gradient(145deg, #3d5a9e 0%, #2d4366 50%, #243b74 100%)",
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(79, 128, 243, 0.22)"
                  : "inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 22px rgba(36, 59, 116, 0.28), 0 0 0 1px rgba(255,255,255,0.2)",
              }}
            >
              <HoverTooltip
                preset={sidebarTooltipPreset}
                isDark={isDark}
                content={<span style={{ whiteSpace: "nowrap" }}>Светлая или тёмная тема оформления</span>}
              >
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  aria-label="Переключить тему"
                  style={{
                    border: "none",
                    background: "rgba(255,255,255,0.1)",
                    padding: 10,
                    borderRadius: 14,
                    cursor: "pointer",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <img
                    decoding="async"
                    src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/uz9yxbza_expires_30_days.png"
                    alt=""
                    style={{ width: 22, height: 22, display: "block" }}
                  />
                </button>
              </HoverTooltip>
              <img
                decoding="async"
                fetchPriority="high"
                src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/u4te4tx0_expires_30_days.png"
                alt=""
                width={36}
                height={36}
                style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  minWidth: 0,
                  maxWidth: 148,
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#f8fafc",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {plaqueName}
                </span>
              </div>
              <HoverTooltip
                preset={sidebarTooltipPreset}
                isDark={isDark}
                content={<span style={{ whiteSpace: "nowrap" }}>Настройки профиля</span>}
              >
                <button
                  type="button"
                  onClick={goToProfile}
                  aria-label="Настройки профиля"
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 4,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: 10,
                  }}
                >
                  <img
                    decoding="async"
                    src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/ac7lp2lp_expires_30_days.png"
                    alt=""
                    width={18}
                    height={18}
                  />
                </button>
              </HoverTooltip>
              <HoverTooltip
                preset={sidebarTooltipPreset}
                isDark={isDark}
                content={<span style={{ whiteSpace: "nowrap" }}>К выбору роли входа</span>}
              >
                <button
                  type="button"
                  onClick={goToRoleSelection}
                  aria-label="К выбору роли"
                  style={{
                    border: "none",
                    background: "rgba(255,255,255,0.1)",
                    padding: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: 12,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                >
                  <img decoding="async" src={ROLES_GRID_ICON} alt="" width={22} height={22} />
                </button>
              </HoverTooltip>
            </div>
          </div>
        </header>

        {cabinetSection === "messenger" ? (
          <main style={mainRegion}>
            <Page5MessengerView
              key={messengerMountKey}
              styles={styles}
              isDark={isDark}
              cabinetPath={cabinetPath}
            />
          </main>
        ) : (
          children(ctx)
        )}
      </div>
      <AiChatBubble isDark={isDark} />
    </div>
  );
}

export default memo(CabinetChromeLayout);
