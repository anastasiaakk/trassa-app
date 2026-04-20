import { memo, useCallback, useEffect, useMemo, useState } from "react";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";
import CabinetHomeIcon from "../components/CabinetHomeIcon";
import {
  AUDIENCE_LABELS,
  getUpcomingEventsForPanel,
  type CalendarEventItem,
} from "./Page5EventsView";
import {
  loadSharedCalendarEvents,
  SHARED_CALENDAR_EVENTS_KEY,
  SHARED_CALENDAR_UPDATED_EVENT,
} from "../utils/sharedCalendarEvents";
import ProforientationTestSection from "../components/ProforientationTestSection";

const CABINET_HERO_SCHOOL = new URL("../assets/cabinet-hero-school.png", import.meta.url).href;
const CABINET_HERO_STUDENT = new URL("../assets/cabinet-hero-student.png", import.meta.url).href;

/** Как на странице выбора роли (Page3 → roleIcons): индекс 0 и 1 */
const ROLE_ICON_SCHOOL =
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/b3pnceya_expires_30_days.png";
const ROLE_ICON_STUDENT =
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/66h5rmum_expires_30_days.png";

export type LearnerCabinetVariant = "school" | "spo";

const DASHBOARD_COPY: Record<
  LearnerCabinetVariant,
  {
    cabinetPath: string;
    asideBadge: string;
    sideCardTitle: string;
    sideCardKicker: string;
    sideCardText: string;
    sideBlocks: { title: string; text: string }[];
    heroTag: string;
    heroTitleFallback: string;
    info: { label: string; title: string; text: string };
    actions: { title: string; text: string }[];
    eventsHint: string;
    eventsEmpty: string;
  }
> = {
  school: {
    cabinetPath: "/cabinet-school",
    asideBadge: "3",
    sideCardKicker: "Трек обучения",
    sideCardTitle: "Школьный модуль 2026",
    sideCardText:
      "Соберите материалы по дорожной тематике и участвуйте в мероприятиях ассоциаций — прогресс отображается в одном окне.",
    sideBlocks: [
      {
        title: "Материалы и задания",
        text: "Доступ к тематическим блокам и проверочным заданиям по мере наполнения курса.",
      },
      {
        title: "Мероприятия",
        text: "Олимпиады, встречи с отраслью и проектные недели — регистрация из этого раздела.",
      },
    ],
    heroTag: "Школа · материалы и события",
    heroTitleFallback: "Укажите имя в настройках профиля — оно отобразится на главной карточке.",
    info: {
      label: "Ассоциации РАДОР и АДО",
      title: "Приглашение на отраслевую неделю",
      text: "Следите за письмами и объявлениями: регистрация на очные и онлайн-активности для школьных команд.",
    },
    actions: [
      {
        title: "Объявления и письма",
        text: "Список обращений от ассоциаций и ответов по вашей учётной записи.",
      },
      {
        title: "Календарь активностей",
        text: "Личные дедлайны и командные вехи в одном расписании.",
      },
    ],
    eventsHint:
      "Мероприятия с аудиторией «Школьники», которые публикуют РАДОР и АДО во вкладке «Мероприятия».",
    eventsEmpty:
      "Пока нет запланированных мероприятий для школьников. Когда ассоциации добавят события с такой аудиторией, они появятся здесь.",
  },
  spo: {
    cabinetPath: "/cabinet-spo",
    asideBadge: "3",
    sideCardKicker: "Учебный план",
    sideCardTitle: "Практика и курсы СПО/ВО",
    sideCardText:
      "Связь с дорожной отраслью: практики, стажировки и учебные модули — в одном контуре с ассоциациями.",
    sideBlocks: [
      {
        title: "Практика и стажировки",
        text: "Заявки и статусы согласования — по мере подключения организаций-партнёров.",
      },
      {
        title: "Учебные модули",
        text: "Рекомендованные материалы и отраслевые курсы для профильной подготовки.",
      },
    ],
    heroTag: "СПО и ВО · практика и карьера",
    heroTitleFallback: "Укажите имя в настройках профиля — оно отобразится на главной карточке.",
    info: {
      label: "Партнёры отрасли",
      title: "Летняя практика и кейсы подрядчиков",
      text: "Просматривайте запросы на практику и отклики: документы и сопровождение — в привычных шаблонах портала.",
    },
    actions: [
      {
        title: "Заявки и ответы",
        text: "Переписка по практике и уведомления от кураторов программ.",
      },
      {
        title: "Портфолио достижений",
        text: "Фиксация проектов и мероприятий для резюме и отбора.",
      },
    ],
    eventsHint:
      "Мероприятия с аудиторией «Студенты», которые публикуют РАДОР и АДО во вкладке «Мероприятия».",
    eventsEmpty:
      "Пока нет запланированных мероприятий для студентов. Когда ассоциации добавят события с такой аудиторией, они появятся здесь.",
  },
};

function filterEventsForVariant(events: CalendarEventItem[], variant: LearnerCabinetVariant): CalendarEventItem[] {
  const aud = variant === "school" ? "schools" : "students";
  return getUpcomingEventsForPanel(
    events.filter((ev) => ev.audience === aud),
    6
  );
}

function LearnerCabinetDashboard({
  ctx,
  variant,
}: {
  ctx: CabinetChromeContext;
  variant: LearnerCabinetVariant;
}) {
  const { styles, layoutStyles, profilePlaque, isDark } = ctx;
  const copy = DASHBOARD_COPY[variant];

  const heroCardStyle = useMemo(() => {
    const heroUrl = variant === "school" ? CABINET_HERO_SCHOOL : CABINET_HERO_STUDENT;
    return {
      ...layoutStyles.heroCard,
      backgroundImage:
        "linear-gradient(180deg, rgba(" +
        (isDark ? "15,23,42,0.58" : "46,69,108,0.45") +
        ") 0%, rgba(" +
        (isDark ? "15,23,42,0.72" : "34,56,88,0.52") +
        ") 100%), url('" +
        heroUrl +
        "')",
      backgroundSize: "cover",
      backgroundPosition: "center center",
    };
  }, [layoutStyles.heroCard, isDark, variant]);
  const heroRoleIconSrc = variant === "school" ? ROLE_ICON_SCHOOL : ROLE_ICON_STUDENT;

  const [sharedCalendarEvents, setSharedCalendarEvents] = useState(() =>
    loadSharedCalendarEvents()
  );

  useEffect(() => {
    const reloadCalendar = () => setSharedCalendarEvents(loadSharedCalendarEvents());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SHARED_CALENDAR_EVENTS_KEY) return;
      reloadCalendar();
    };
    window.addEventListener(SHARED_CALENDAR_UPDATED_EVENT, reloadCalendar);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", reloadCalendar);
    return () => {
      window.removeEventListener(SHARED_CALENDAR_UPDATED_EVENT, reloadCalendar);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", reloadCalendar);
    };
  }, []);

  const heroDisplayName = [profilePlaque.firstName, profilePlaque.lastName].filter(Boolean).join(" ").trim();

  const upcomingEvents = useMemo(
    () => filterEventsForVariant(sharedCalendarEvents, variant),
    [sharedCalendarEvents, variant]
  );

  return (
    <main style={layoutStyles.main}>
      <aside style={layoutStyles.aside}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "18px",
            borderRadius: 32,
            background: styles.cardBg,
            color: styles.text,
            fontWeight: 700,
            boxShadow: styles.insetShadow,
          }}
        >
          <CabinetHomeIcon size={22} color={styles.text} />
          <span>Главная</span>
          <span
            style={{
              marginLeft: "auto",
              background: styles.sectionBg,
              color: styles.text,
              fontWeight: 700,
              borderRadius: 9999,
              padding: "6px 14px",
              fontSize: 12,
            }}
          >
            {copy.asideBadge}
          </span>
        </div>
        <div style={layoutStyles.sideCard}>
          <div style={{ fontSize: 12, color: styles.muted, marginBottom: 10 }}>{copy.sideCardKicker}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{copy.sideCardTitle}</div>
          <div style={{ fontSize: 14, color: styles.muted, lineHeight: 1.7 }}>{copy.sideCardText}</div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {copy.sideBlocks.map((b) => (
            <button key={b.title} type="button" style={layoutStyles.sideBlock}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{b.title}</div>
              <div style={{ fontSize: 13, color: styles.muted }}>{b.text}</div>
            </button>
          ))}
        </div>
      </aside>
      <section style={layoutStyles.section}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.95fr)",
            gap: 24,
            alignItems: "stretch",
          }}
        >
          <div style={heroCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" style={layoutStyles.heroTag}>
                {copy.heroTag}
              </button>
              <button type="button" style={layoutStyles.heroButton}>
                <img
                  decoding="async"
                  src={heroRoleIconSrc}
                  alt=""
                  width={22}
                  height={22}
                  style={{ display: "block", objectFit: "contain" }}
                />
              </button>
            </div>
            {heroDisplayName ? (
              <div style={layoutStyles.heroTitle}>{heroDisplayName}</div>
            ) : (
              <div style={layoutStyles.heroTitleEmpty}>{copy.heroTitleFallback}</div>
            )}
          </div>
          <div style={{ display: "grid", gap: 22 }}>
            <div style={layoutStyles.infoCard}>
              <div style={layoutStyles.infoLabel}>{copy.info.label}</div>
              <div style={layoutStyles.infoTitle}>{copy.info.title}</div>
              <div style={layoutStyles.infoText}>{copy.info.text}</div>
            </div>
            {copy.actions.map((a) => (
              <button key={a.title} type="button" style={layoutStyles.actionCard}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{a.title}</div>
                <div style={{ fontSize: 13, color: styles.muted }}>{a.text}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={layoutStyles.recentPanel}>
          <div style={layoutStyles.recentTitle}>Ближайшие мероприятия</div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 4 }}>
            {copy.eventsHint}
          </div>
          {upcomingEvents.length === 0 ? (
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
              {copy.eventsEmpty}
            </div>
          ) : (
            upcomingEvents.map((ev) => {
              const dateLabel = new Date(`${ev.date}T12:00:00`).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <div
                  key={ev.id}
                  style={{
                    padding: 18,
                    borderRadius: 24,
                    background: styles.sectionBg,
                    color: styles.text,
                    boxShadow: styles.insetShadow,
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, marginTop: 6, color: styles.muted, fontWeight: 600 }}>
                    {dateLabel} · {ev.time} · {AUDIENCE_LABELS[ev.audience]}
                  </div>
                  {ev.description ? (
                    <div style={{ fontSize: 13, marginTop: 8, color: styles.muted, lineHeight: 1.45 }}>
                      {ev.description.length > 160 ? `${ev.description.slice(0, 160)}…` : ev.description}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        <ProforientationTestSection styles={styles} learnerKind={variant} />
      </section>
    </main>
  );
}

function CabinetLearnerHome({ variant }: { variant: LearnerCabinetVariant }) {
  const copy = DASHBOARD_COPY[variant];
  const renderDashboard = useCallback(
    (ctx: CabinetChromeContext) => <LearnerCabinetDashboard ctx={ctx} variant={variant} />,
    [variant]
  );

  return (
    <CabinetChromeLayout cabinetPath={copy.cabinetPath}>
      {renderDashboard}
    </CabinetChromeLayout>
  );
}

export default memo(CabinetLearnerHome);
