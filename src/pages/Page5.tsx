import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadCabinetTheme, loadProfileSettings, saveCabinetTheme } from "../profileSettingsStorage";
import { AiChatBubble } from "../components/AiChatBubble";
import { FloatingNotes } from "../components/FloatingNotes";
import { getHoverTooltipPreset, HoverTooltip } from "../components/HoverTooltip";
import {
  AUDIENCE_LABELS,
  type CalendarEventItem,
  getUpcomingEventsForPanel,
  Page5EventsView,
} from "./Page5EventsView";
import {
  loadSharedCalendarEvents,
  saveSharedCalendarEvents,
  SHARED_CALENDAR_EVENTS_KEY,
} from "../utils/sharedCalendarEvents";
import { ensureMessengerUidInProfile } from "../utils/messengerInvite";
import { isMessengerHiddenForMe } from "../utils/messengerHiddenForMe";
import {
  applyMessengerInvitePayload,
  decodeMessengerInvite,
  MSGR_INVITE_PARAM,
} from "../utils/messengerInvite";
import { injectImagePreloads } from "../utils/imagePreload";
import {
  ADMIN_CABINET_SEARCH,
  clearAdminReturnMark,
  shouldShowReturnToAdminDashboard,
} from "../utils/adminReturnNavigation";
import { Page5MessengerView } from "./Page5MessengerView";
import { ProforientationResultsTable } from "../components/ProforientationEmployerPanels";
import AssociationDocumentsView from "./AssociationDocumentsView";
import AssociationIncomingDocumentsView from "./AssociationIncomingDocumentsView";
import AssociationStudentTeamsView from "./AssociationStudentTeamsView";
import type { CSSProperties } from "react";

export type AssociationVariant = "rador" | "ado";

const ASSOCIATION_INTRO_PARAGRAPH =
  "Личный кабинет предназначен для работы со студенческими дорожными командами, планирования мероприятий и ведения документооборота.";

function getAssociationCopy(variant: AssociationVariant) {
  if (variant === "ado") {
    return {
      archiveTag: "Архив ADO",
      badgeTitle: "Ассоциация \"АДО\"",
      introParagraph: ASSOCIATION_INTRO_PARAGRAPH,
    };
  }
  return {
    archiveTag: "Архив RADOR",
    badgeTitle: "Ассоциация \"РАДОР\"",
    introParagraph: ASSOCIATION_INTRO_PARAGRAPH,
  };
}

const projectMetrics = [
  { title: "Запросы", value: "1" },
  { title: "Документы", value: "67" },
  { title: "Требуется человек", value: "704" },
  { title: "Подрядчиков", value: "67" },
];

type CabinetSection = "dashboard" | "events" | "messenger";

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

/** Локальная симуляция входящего (нет сервера). Для проверки бейджа: сверните мессенджер, нажмите «Тест: входящее». */
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

const PAGE5_PRELOAD_IMAGES = [
  ROLES_GRID_ICON,
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/w5oazpzp_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/k21ztar3_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/uz9yxbza_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/u4te4tx0_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/ac7lp2lp_expires_30_days.png",
] as const;

export function AssociationPage({ variant }: { variant: AssociationVariant }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">(() => loadCabinetTheme());
  const [profilePlaque, setProfilePlaque] = useState(() => loadProfileSettings());
  const [search, setSearch] = useState("");
  const [cabinetSection, setCabinetSection] = useState<CabinetSection>("dashboard");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>(() =>
    loadSharedCalendarEvents()
  );
  const [messengerSeenAt, setMessengerSeenAt] = useState(() => readMessengerSeenAt());
  const [messengerHasUnread, setMessengerHasUnread] = useState(() =>
    typeof window !== "undefined" ? scanMessengerInboxUnread(readMessengerSeenAt()) : false
  );
  /** Сброс монтирования мессенджера после применения приглашения по ссылке */
  const [messengerMountKey, setMessengerMountKey] = useState(0);

  const associationCopy = useMemo(() => getAssociationCopy(variant), [variant]);

  const basePath = variant === "ado" ? "/page6" : "/page5";
  const isProforientationRoute = location.pathname === `${basePath}/proforientation`;
  const isAssociationDocumentsMain = location.pathname === `${basePath}/documents`;
  const isIncomingDocumentsRoute = location.pathname === `${basePath}/documents/incoming`;
  const isDocumentsSectionRoute = isAssociationDocumentsMain || isIncomingDocumentsRoute;
  const isTeamsRoute = location.pathname === `${basePath}/teams`;

  const leaveProforientationPath = useCallback(() => {
    const nested = [
      `${basePath}/proforientation`,
      `${basePath}/documents`,
      `${basePath}/documents/incoming`,
      `${basePath}/teams`,
    ];
    if (nested.includes(location.pathname)) {
      navigate(basePath, { replace: true });
    }
  }, [basePath, location.pathname, navigate]);

  const recalcMessengerBadge = useCallback(() => {
    if (cabinetSection === "messenger") {
      setMessengerHasUnread(false);
      return;
    }
    setMessengerHasUnread(scanMessengerInboxUnread(messengerSeenAt));
  }, [cabinetSection, messengerSeenAt]);

  useEffect(() => {
    recalcMessengerBadge();
  }, [recalcMessengerBadge]);

  useEffect(() => {
    const onUpd = () => recalcMessengerBadge();
    window.addEventListener("trassa-messenger-updated", onUpd);
    return () => window.removeEventListener("trassa-messenger-updated", onUpd);
  }, [recalcMessengerBadge]);

  useEffect(() => {
    if (cabinetSection !== "messenger") return;
    const t = Date.now();
    try {
      localStorage.setItem(MSGR_SEEN_KEY, String(t));
    } catch {
      /* ignore */
    }
    setMessengerSeenAt(t);
    setMessengerHasUnread(false);
  }, [cabinetSection]);

  /** Ссылка вида #/page5?messengerInvite=… — открыть мессенджер и добавить контакт из приглашения */
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const t = sp.get(MSGR_INVITE_PARAM);
    if (!t) return;
    const data = decodeMessengerInvite(t);
    if (!data) {
      navigate({ pathname: location.pathname, search: "" }, { replace: true });
      return;
    }
    applyMessengerInvitePayload(data);
    const nested = [
      `${basePath}/proforientation`,
      `${basePath}/documents`,
      `${basePath}/documents/incoming`,
      `${basePath}/teams`,
    ];
    if (nested.includes(location.pathname)) {
      navigate(basePath, { replace: true });
    }
    setCabinetSection("messenger");
    setMessengerMountKey((k) => k + 1);
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
  }, [location.search, location.pathname, navigate, basePath]);

  const upcomingPanelEvents = useMemo(
    () => getUpcomingEventsForPanel(calendarEvents, 6),
    [calendarEvents]
  );

  useEffect(() => {
    saveSharedCalendarEvents(calendarEvents);
  }, [calendarEvents]);

  /** Другая вкладка изменила календарь — подтянуть без цикла (в своей вкладке состояние уже актуально). */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SHARED_CALENDAR_EVENTS_KEY || e.newValue == null) return;
      setCalendarEvents(loadSharedCalendarEvents());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pageCards = useMemo(
    () => [
      {
        title: "Студенческие дорожные команды",
        description:
          "Запросы и ответы ТОУАД, свод обращений и работа с корпоративными шаблонами в одном контуре.",
        icon: "🚧",
        accent: "#4f80f3",
        accentSoft: "rgba(79, 128, 243, 0.22)",
        tag: "Рабочий контур",
      },
      {
        title: "Мероприятия",
        description:
          "Календарь отрасли: очные и онлайн-активности, встречи и контрольные даты для участников.",
        icon: "📰",
        accent: "#2dd4bf",
        accentSoft: "rgba(45, 212, 191, 0.2)",
        tag: "Афиша",
      },
      {
        title: "Документы",
        description:
          "Публикация материалов, обмен файлами и единое хранилище сводной документации.",
        icon: "📃",
        accent: "#f59e0b",
        accentSoft: "rgba(245, 158, 11, 0.22)",
        tag: associationCopy.archiveTag,
      },
    ],
    [associationCopy.archiveTag]
  );

  const isDark = theme === "dark";

  const sidebarTooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const goToRoleSelection = useCallback(() => {
    clearAdminReturnMark();
    navigate("/page3");
  }, [navigate]);

  const goToAdminCabinet = useCallback(() => {
    navigate({ pathname: "/services", search: `?${ADMIN_CABINET_SEARCH}` });
  }, [navigate]);

  const goToProfile = useCallback(() => {
    navigate("/profile", { state: { from: location.pathname } });
  }, [navigate, location.pathname]);

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

  /** Неоморфные плашки разделов главной (РАДОР / АДО) */
  const neoDashboardCards = useMemo(() => {
    const cardRaised = (): CSSProperties => ({
      position: "relative",
      borderRadius: 32,
      padding: "26px 24px 22px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: 288,
      border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.78)",
      background: isDark
        ? `linear-gradient(165deg, #1e2e46 0%, #172236 42%, #121b2c 100%)`
        : `linear-gradient(165deg, #f7faff 0%, #eef3fb 48%, #e7eff8 100%)`,
      boxShadow: isDark
        ? "16px 16px 38px rgba(0,0,0,0.48), -12px -12px 34px rgba(42,64,96,0.28), inset 1px 1px 0 rgba(255,255,255,0.05)"
        : "20px 20px 44px rgba(118, 136, 168, 0.32), -16px -16px 42px rgba(255, 255, 255, 0.98), inset 2px 2px 5px rgba(255, 255, 255, 0.92)",
    });

    const accentBar = (accent: string, accentSoft: string): CSSProperties => ({
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 5,
      borderRadius: "0 0 14px 14px",
      background: isDark
        ? `linear-gradient(90deg, ${accent} 0%, ${accent}99 55%, ${accent}66 100%)`
        : `linear-gradient(90deg, ${accent}dd 0%, ${accent} 40%, ${accentSoft} 100%)`,
      boxShadow: isDark ? `0 2px 12px ${accentSoft}` : `0 3px 14px ${accentSoft}`,
    });

    const iconWell = (accent: string): CSSProperties => ({
      width: 72,
      height: 72,
      borderRadius: 22,
      display: "grid",
      placeItems: "center",
      fontSize: 30,
      lineHeight: 1,
      flexShrink: 0,
      background: isDark
        ? `linear-gradient(150deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.22) 100%)`
        : `linear-gradient(150deg, #ffffff 0%, ${accent}14 100%)`,
      boxShadow: isDark
        ? "inset 8px 8px 18px rgba(0,0,0,0.42), inset -3px -3px 12px rgba(100,140,220,0.1)"
        : "inset 10px 10px 22px rgba(148, 162, 190, 0.42), inset -5px -5px 16px rgba(255, 255, 255, 1)",
      border: `1px solid ${isDark ? `${accent}45` : "rgba(255,255,255,0.92)"}`,
    });

    const tagChip: CSSProperties = {
      padding: "9px 14px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      color: isDark ? "rgba(226, 232, 240, 0.88)" : styles.muted,
      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.72)",
      boxShadow: isDark
        ? "4px 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)"
        : "6px 6px 14px rgba(154, 170, 198, 0.35), -3px -3px 12px rgba(255,255,255,0.95), inset 1px 1px 2px rgba(255,255,255,0.95)",
      border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.85)",
    };

    const openBtn: CSSProperties = {
      border: "none",
      borderRadius: 999,
      padding: "13px 28px",
      fontWeight: 700,
      fontSize: 14,
      cursor: "pointer",
      fontFamily: "inherit",
      color: styles.buttonText,
      background: `linear-gradient(155deg, #2f4d92 0%, ${styles.buttonBg} 55%, #1e3260 100%)`,
      boxShadow: isDark
        ? "6px 6px 18px rgba(0,0,0,0.4), -2px -2px 10px rgba(80,120,200,0.15), inset 0 1px 0 rgba(255,255,255,0.18)"
        : "8px 8px 22px rgba(100, 124, 168, 0.4), -4px -4px 16px rgba(255,255,255,0.85), inset 0 1px 0 rgba(255,255,255,0.25)",
    };

    const metaDot = (accent: string): CSSProperties => ({
      width: 11,
      height: 11,
      borderRadius: "50%",
      background: `radial-gradient(circle at 30% 28%, ${accent}ff, ${accent}99)`,
      boxShadow: isDark
        ? `0 0 10px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.35)`
        : `0 2px 8px ${accent}55, inset 0 -1px 2px rgba(0,0,0,0.12)`,
    });

    return { cardRaised, accentBar, iconWell, tagChip, openBtn, metaDot };
  }, [isDark, styles.buttonBg, styles.buttonText, styles.muted]);

  const proforientationLayoutStyles = useMemo(
    () =>
      ({
        recentPanel: {
          borderRadius: 32,
          padding: "22px 28px 28px",
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
      }) satisfies Record<string, CSSProperties>,
    [styles, isDark]
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
    return injectImagePreloads(PAGE5_PRELOAD_IMAGES);
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = styles.pageBg;
  }, [styles.pageBg]);

  const filteredCards = useMemo(
    () =>
      pageCards.filter(
        (card) =>
          !normalizedSearch ||
          card.title.toLowerCase().includes(normalizedSearch) ||
          card.description.toLowerCase().includes(normalizedSearch)
      ),
    [normalizedSearch, pageCards]
  );

  const plaqueName = profilePlaque.firstName.trim() || "Пользователь";

  const mainRegion = {
    flex: 1,
    minHeight: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column" as const,
    boxSizing: "border-box" as const,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: styles.pageBg,
        color: styles.text,
        fontFamily: "Inter, sans-serif",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          flex: 1,
          minHeight: 0,
          width: "100%",
        }}
      >
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
                alt="search icon"
                style={{ width: 18, height: 18 }}
              />
              <input
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
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
                  onClick={() => {
                    leaveProforientationPath();
                    setCabinetSection((prev) => (prev === "messenger" ? "dashboard" : "messenger"));
                  }}
                  aria-label="Мессенджер"
                  style={{
                    border: "none",
                    background: cabinetSection === "messenger" ? (isDark ? "rgba(79, 128, 243, 0.35)" : "rgba(36, 59, 116, 0.92)") : styles.buttonBg,
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
            {import.meta.env.DEV ? (
              <button
                type="button"
                onClick={() => injectMessengerTestIncoming()}
                title="Симуляция входящего сообщения. Сверните мессенджер — на иконке появится точка."
                style={{
                  border: "none",
                  background: "transparent",
                  color: styles.muted,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                  padding: "4px 0",
                  fontFamily: "inherit",
                }}
              >
                Тест: входящее
              </button>
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

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 10,
            padding: "4px 0 0",
          }}
          aria-label="Разделы кабинета"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={() => {
                navigate(basePath);
                setCabinetSection("dashboard");
              }}
              style={{
                border: "none",
                cursor: "pointer",
                borderRadius: 22,
                padding: "14px 26px",
                fontWeight: 700,
                fontSize: 15,
                color: styles.text,
                fontFamily: "inherit",
                ...(!isProforientationRoute &&
                !isDocumentsSectionRoute &&
                !isTeamsRoute &&
                cabinetSection === "dashboard"
                  ? {
                      background: styles.cardBg,
                      boxShadow: styles.insetShadow,
                    }
                  : {
                      background: styles.sectionBg,
                      boxShadow: styles.cardShadow,
                    }),
              }}
            >
              Главная
            </button>
            <button
              type="button"
              onClick={() => {
                leaveProforientationPath();
                setCabinetSection("events");
              }}
              style={{
                border: "none",
                cursor: "pointer",
                borderRadius: 22,
                padding: "14px 26px",
                fontWeight: 700,
                fontSize: 15,
                color: styles.text,
                fontFamily: "inherit",
                ...(cabinetSection === "events"
                  ? {
                      background: styles.cardBg,
                      boxShadow: styles.insetShadow,
                    }
                  : {
                      background: styles.sectionBg,
                      boxShadow: styles.cardShadow,
                    }),
              }}
            >
              Мероприятия
            </button>
          </div>
        </nav>

        {cabinetSection === "events" ? (
          <main style={mainRegion}>
            <Page5EventsView
              styles={styles}
              isDark={isDark}
              events={calendarEvents}
              onEventsChange={setCalendarEvents}
            />
          </main>
        ) : cabinetSection === "messenger" ? (
          <main style={mainRegion}>
            <Page5MessengerView
              key={messengerMountKey}
              styles={styles}
              isDark={isDark}
              cabinetPath={location.pathname}
            />
          </main>
        ) : isIncomingDocumentsRoute ? (
          <main
            style={{
              ...mainRegion,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <AssociationIncomingDocumentsView
              styles={styles}
              association={variant === "ado" ? "ado" : "rador"}
              layoutStyles={proforientationLayoutStyles}
              basePath={basePath}
            />
          </main>
        ) : isAssociationDocumentsMain ? (
          <main
            style={{
              ...mainRegion,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <AssociationDocumentsView
              styles={styles}
              association={variant === "ado" ? "ado" : "rador"}
              layoutStyles={proforientationLayoutStyles}
              incomingDocumentsPath={`${basePath}/documents/incoming`}
              isDark={isDark}
            />
          </main>
        ) : isTeamsRoute ? (
          <main
            style={{
              ...mainRegion,
              marginTop: -14,
              paddingTop: 0,
            }}
          >
            <AssociationStudentTeamsView
              styles={styles}
              association={variant === "ado" ? "ado" : "rador"}
              layoutStyles={proforientationLayoutStyles}
            />
          </main>
        ) : isProforientationRoute ? (
          <main
            style={{
              ...mainRegion,
              marginTop: -14,
              paddingTop: 0,
            }}
          >
            <ProforientationResultsTable styles={styles} layoutStyles={proforientationLayoutStyles} />
          </main>
        ) : (
        <>
        <main
          style={{
            ...mainRegion,
            display: "grid",
            gridTemplateColumns: "1.7fr 0.95fr",
            gap: 28,
            alignContent: "start",
          }}
        >
          <section
            style={{
              borderRadius: 32,
              background: styles.sectionBg,
              padding: 32,
              boxShadow: styles.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
              <div style={{ maxWidth: 680 }}>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14, color: styles.muted }}>
                  {associationCopy.badgeTitle}
                </div>
                <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.05, fontWeight: 700, color: styles.text }}>
                  Запросы, свод информации и связь со всеми участниками
                </h1>
                <p style={{ marginTop: 18, maxWidth: 680, fontSize: 16, lineHeight: 1.75, color: styles.muted }}>
                  {associationCopy.introParagraph}
                </p>
              </div>

              <div style={{ minWidth: 220, padding: 24, borderRadius: 32, background: styles.cardBg, color: styles.text, boxShadow: styles.insetShadow }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, color: styles.muted }}>
                  Статус проекта
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Июнь 2026</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: styles.muted }}>
                  Прозрачный обзор работы подрядчиков, статистика ответов и статус документов.
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 20 }}>
              {projectMetrics.map((metric) => (
                <div
                  key={metric.title}
                  style={{
                    borderRadius: 36,
                    padding: 24,
                    background: styles.cardBg,
                    boxShadow: styles.cardShadow,
                    minHeight: 120,
                    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.9)",
                  }}
                >
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", color: styles.muted }}>{metric.title}</div>
                  <div style={{ fontSize: 34, fontWeight: 700, color: styles.text }}>{metric.value}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 26,
              }}
            >
              {filteredCards.map((card) => (
                <div
                  key={card.title}
                  style={{
                    ...neoDashboardCards.cardRaised(),
                  }}
                >
                  <div
                    style={neoDashboardCards.accentBar(card.accent, card.accentSoft)}
                    aria-hidden
                  />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 14,
                        marginBottom: 18,
                      }}
                    >
                      <div style={neoDashboardCards.iconWell(card.accent)}>{card.icon}</div>
                      <span style={neoDashboardCards.tagChip}>{card.tag}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 21,
                        fontWeight: 800,
                        lineHeight: 1.25,
                        marginBottom: 12,
                        color: styles.text,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {card.title}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        lineHeight: 1.75,
                        color: styles.muted,
                      }}
                    >
                      {card.description}
                    </p>
                  </div>

                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 14,
                      marginTop: 22,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        leaveProforientationPath();
                        if (card.title === "Мероприятия") {
                          setCabinetSection("events");
                        } else if (card.title === "Студенческие дорожные команды") {
                          navigate(`${basePath}/teams`);
                        } else if (card.title === "Документы") {
                          navigate(`${basePath}/documents`);
                        }
                      }}
                      style={neoDashboardCards.openBtn}
                    >
                      Открыть
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={neoDashboardCards.metaDot(card.accent)} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: styles.muted, letterSpacing: "0.02em" }}>
                        Рабочая панель
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate(`${basePath}/proforientation`)}
              style={{
                width: "100%",
                marginTop: 8,
                border: isProforientationRoute ? "2px solid #243b74" : "none",
                borderRadius: 28,
                padding: "18px 22px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                background: isProforientationRoute ? styles.cardBg : styles.sectionBg,
                boxShadow: isProforientationRoute ? styles.insetShadow : styles.cardShadow,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: styles.muted, marginBottom: 4 }}
              >
                ПРОФОРИЕНТАЦИЯ
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: styles.text }}>Результаты теста</div>
              <div style={{ fontSize: 13, color: styles.muted, marginTop: 6, lineHeight: 1.4 }}>
                Школьники и студенты — открыть отчёт →
              </div>
            </button>
          </section>

          <aside style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ padding: 28, borderRadius: 32, background: styles.sectionBg, boxShadow: styles.cardShadow }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: styles.text }}>
                Приволжский федеральный округ
              </div>
              <div style={{ fontSize: 14, color: styles.muted, marginBottom: 16 }}>
                Ответил на 3 из 4 запросов
              </div>
              <div style={{ height: 10, borderRadius: 999, background: isDark ? "#102140" : "#eaf1ff" }}>
                <div style={{ width: "84%", height: "100%", borderRadius: 999, background: "#4f80f3" }} />
              </div>
              <div style={{ fontSize: 12, letterSpacing: "1px", textTransform: "uppercase", color: styles.muted, marginTop: 12 }}>
                84% исполнения
              </div>
            </div>

            <div
              style={{
                padding: 28,
                borderRadius: 36,
                background: styles.cardBg,
                boxShadow: styles.cardShadow,
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.8)",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: styles.text }}>
                Ближайшие мероприятия
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {upcomingPanelEvents.length === 0 ? (
                  <div
                    style={{
                      padding: 18,
                      borderRadius: 24,
                      background: styles.sectionBg,
                      color: styles.muted,
                      boxShadow: styles.insetShadow,
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    Созданных мероприятий пока нет. Добавьте их во вкладке «Мероприятия» — они появятся здесь.
                  </div>
                ) : (
                  upcomingPanelEvents.map((ev) => {
                    const dateLabel = new Date(`${ev.date}T12:00:00`).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    return (
                      <div
                        key={ev.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          padding: 18,
                          borderRadius: 24,
                          background: styles.sectionBg,
                          color: styles.text,
                          boxShadow: styles.insetShadow,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            leaveProforientationPath();
                            setCabinetSection("events");
                          }}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            fontFamily: "inherit",
                            color: "inherit",
                            padding: 0,
                          }}
                        >
                          <div style={{ fontSize: 16, fontWeight: 700 }}>{ev.title}</div>
                          <div style={{ fontSize: 12, marginTop: 6, color: styles.muted, fontWeight: 600 }}>
                            {dateLabel} · {ev.time} · {AUDIENCE_LABELS[ev.audience]}
                          </div>
                          {ev.description ? (
                            <div style={{ fontSize: 13, marginTop: 8, color: styles.muted, lineHeight: 1.45 }}>
                              {ev.description.length > 120 ? `${ev.description.slice(0, 120)}…` : ev.description}
                            </div>
                          ) : null}
                        </button>
                        <HoverTooltip
                          preset={sidebarTooltipPreset}
                          isDark={isDark}
                          content={<span style={{ whiteSpace: "nowrap" }}>Отменить мероприятие</span>}
                        >
                          <button
                            type="button"
                            aria-label="Отменить мероприятие"
                            onClick={() =>
                              setCalendarEvents((prev) =>
                                prev.map((item) =>
                                  item.id === ev.id ? { ...item, cancelled: true } : item
                                )
                              )
                            }
                            style={{
                              flexShrink: 0,
                              border: "none",
                              cursor: "pointer",
                              borderRadius: 12,
                              padding: "6px 10px",
                              fontSize: 18,
                              lineHeight: 1,
                              fontWeight: 400,
                              color: styles.muted,
                              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)",
                              fontFamily: "system-ui, Segoe UI, Roboto, sans-serif",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ×
                          </button>
                        </HoverTooltip>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </main>
        </>
        )}
      </div>
      <FloatingNotes isDark={isDark} />
      <AiChatBubble isDark={isDark} />
    </div>
  );
}

function Page5() {
  return <AssociationPage variant="rador" />;
}

export default memo(Page5);
