import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";
import { ContractorCabinetAside } from "../components/ContractorCabinetAside";
import { AUDIENCE_LABELS, getUpcomingStudentSchoolEventsForPanel } from "./Page5EventsView";
import {
  loadSharedCalendarEvents,
  SHARED_CALENDAR_EVENTS_KEY,
  SHARED_CALENDAR_UPDATED_EVENT,
} from "../utils/sharedCalendarEvents";
import { Page4ContractorProforientationMain } from "./Page4ContractorProforientation";
import ContractorDocumentsView from "./ContractorDocumentsView";
import ContractorStudentTeamsView from "./ContractorStudentTeamsView";

function ContractorCabinetDashboard({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles, profilePlaque } = ctx;
  const location = useLocation();
  const isDocumentsPage = location.pathname === "/page4/documents";
  const isTeamsPage = location.pathname === "/page4/teams";
  const isProforientationPage = location.pathname === "/page4/proforientation";
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

  const contractorHeroTitle = profilePlaque.contractorCompanyName.trim();

  const contractorUpcomingEvents = useMemo(
    () => getUpcomingStudentSchoolEventsForPanel(sharedCalendarEvents, 6),
    [sharedCalendarEvents]
  );

  if (isDocumentsPage) {
    return (
      <main style={layoutStyles.main}>
        <ContractorCabinetAside styles={styles} layoutStyles={layoutStyles} active="documents" />
        <section style={layoutStyles.section}>
          <ContractorDocumentsView styles={styles} layoutStyles={layoutStyles} isDark={ctx.isDark} />
        </section>
      </main>
    );
  }

  if (isTeamsPage) {
    return (
      <main style={layoutStyles.main}>
        <ContractorCabinetAside styles={styles} layoutStyles={layoutStyles} active="teams" />
        <section style={layoutStyles.section}>
          <ContractorStudentTeamsView styles={styles} layoutStyles={layoutStyles} />
        </section>
      </main>
    );
  }

  if (isProforientationPage) {
    return (
      <main style={layoutStyles.main}>
        <ContractorCabinetAside
          styles={styles}
          layoutStyles={layoutStyles}
          active="proforientation"
        />
        <Page4ContractorProforientationMain ctx={ctx} />
      </main>
    );
  }

  return (
    <main style={layoutStyles.main}>
      <ContractorCabinetAside styles={styles} layoutStyles={layoutStyles} active="home" />
      <section style={layoutStyles.section}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.95fr)",
            gap: 24,
            alignItems: "stretch",
          }}
        >
          <div style={layoutStyles.heroCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" style={layoutStyles.heroTag}>
                Письма, практика и обучение
              </button>
              <button type="button" style={layoutStyles.heroButton}>
                <img
                  decoding="async"
                  src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/of5s9282_expires_30_days.png"
                  alt=""
                  style={{ width: 22, height: 22 }}
                />
              </button>
            </div>
            {contractorHeroTitle ? (
              <div style={layoutStyles.heroTitle}>{contractorHeroTitle}</div>
            ) : (
              <div style={layoutStyles.heroTitleEmpty}>
                Укажите наименование организации в настройках профиля — оно появится здесь.
              </div>
            )}
          </div>
          <div style={{ display: "grid", gap: 22 }}>
            <div style={layoutStyles.infoCard}>
              <div style={layoutStyles.infoLabel}>письмо от Ассоциации «РАДОР»</div>
              <div style={layoutStyles.infoTitle}>Запрос на летнюю практику 2026</div>
              <div style={layoutStyles.infoText}>
                Подрядчик может редактировать письмо и структуру таблицы. Может просматривать, готовить ответ и загружать
                сопровождающие файлы в существующих шаблонах таблиц.
              </div>
            </div>
            <button type="button" style={layoutStyles.actionCard}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Письма и уведомления</div>
              <div style={{ fontSize: 13, color: styles.muted }}>
                Открыть список писем и увидеть последние запросы.
              </div>
            </button>
            <button type="button" style={layoutStyles.actionCard}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Таблица практики</div>
              <div style={{ fontSize: 13, color: styles.muted }}>
                Открыть таблицу, которую администратор может редактировать и наполнять.
              </div>
            </button>
          </div>
        </div>
        <div style={layoutStyles.recentPanel}>
          <div style={layoutStyles.recentTitle}>Ближайшие мероприятия</div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 4 }}>
            Мероприятия для студентов и школьников, которые создают ассоциации РАДОР и АДО во вкладке «Мероприятия».
          </div>
          {contractorUpcomingEvents.length === 0 ? (
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
              Пока нет запланированных мероприятий для студентов и школьников. Когда РАДОР или АДО добавят события с
              такой аудиторией, они появятся здесь.
            </div>
          ) : (
            contractorUpcomingEvents.map((ev) => {
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
      </section>
    </main>
  );
}

const Page4 = () => {
  const renderDashboard = useCallback((ctx: CabinetChromeContext) => <ContractorCabinetDashboard ctx={ctx} />, []);

  return (
    <CabinetChromeLayout cabinetPath="/page4">
      {renderDashboard}
    </CabinetChromeLayout>
  );
};

export default memo(Page4);
