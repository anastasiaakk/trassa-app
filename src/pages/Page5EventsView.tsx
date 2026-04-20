import {
  memo,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { getHoverTooltipPreset, HoverTooltip } from "../components/HoverTooltip";

export type Page5ThemeStyles = {
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

/** Для кого мероприятие: частные лица, студенты или школьники */
export type EventAudience = "private" | "students" | "schools";

export const AUDIENCE_LABELS: Record<EventAudience, string> = {
  private: "Частные",
  students: "Студенты",
  schools: "Школьники",
};

const AUDIENCE_SHORT: Record<EventAudience, string> = {
  private: "Частн.",
  students: "Студ.",
  schools: "Школ.",
};

export type CalendarEventItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  audience: EventAudience;
  /** Отменённое мероприятие остаётся в календаре, но не попадает в «Ближайшие». */
  cancelled?: boolean;
};

/** События с сегодняшней даты и далее, по дате/времени — для блока «Ближайшие мероприятия». */
export function getUpcomingEventsForPanel(events: CalendarEventItem[], limit = 6): CalendarEventItem[] {
  const t = new Date();
  const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  return [...events]
    .filter((ev) => !ev.cancelled && ev.date >= todayStr)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "00:00").localeCompare(b.time || "00:00");
    })
    .slice(0, limit);
}

/**
 * Ближайшие мероприятия для подрядчиков: только для аудиторий «Студенты» и «Школьники»
 * (созданные РАДОР/АДО во вкладке «Мероприятия»).
 */
export function getUpcomingStudentSchoolEventsForPanel(events: CalendarEventItem[], limit = 6): CalendarEventItem[] {
  const forStudentsAndSchools = events.filter(
    (ev) => ev.audience === "students" || ev.audience === "schools"
  );
  return getUpcomingEventsForPanel(forStudentsAndSchools, limit);
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(y: number, monthIndex: number, day: number) {
  return `${y}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function buildMonthCells(year: number, monthIndex: number): (number | null)[] {
  const first = new Date(year, monthIndex, 1);
  const mondayFirst = (first.getDay() + 6) % 7;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < mondayFirst; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

type Props = {
  styles: Page5ThemeStyles;
  isDark: boolean;
  events: CalendarEventItem[];
  onEventsChange: Dispatch<SetStateAction<CalendarEventItem[]>>;
};

export const Page5EventsView = memo(function Page5EventsView({
  styles,
  isDark,
  events,
  onEventsChange,
}: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("10:00");
  const [formDescription, setFormDescription] = useState("");
  const [formAudience, setFormAudience] = useState<EventAudience>("students");

  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();

  const cells = useMemo(() => buildMonthCells(year, monthIndex), [year, monthIndex]);

  const monthLabel = `${MONTH_NAMES[monthIndex]} ${year}`;

  const goPrev = useCallback(() => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }, []);

  const goNext = useCallback(() => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }, []);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEventItem[]>();
    for (const ev of events) {
      const list = m.get(ev.date) ?? [];
      list.push(ev);
      m.set(ev.date, list);
    }
    return m;
  }, [events]);

  const openCreate = useCallback((dateKey: string) => {
    setFormDate(dateKey);
    setFormTitle("");
    setFormTime("10:00");
    setFormDescription("");
    setFormAudience("students");
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const submitEvent = useCallback(() => {
    const t = formTitle.trim();
    if (!t || !formDate) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    onEventsChange((prev) => [
      ...prev,
      {
        id,
        title: t,
        date: formDate,
        time: formTime.trim() || "—",
        description: formDescription.trim(),
        audience: formAudience,
        cancelled: false,
      },
    ]);
    setModalOpen(false);
  }, [formTitle, formDate, formTime, formDescription, formAudience, onEventsChange]);

  const setEventCancelled = useCallback(
    (id: string, cancelled: boolean) => {
      onEventsChange((prev) =>
        prev.map((ev) => (ev.id === id ? { ...ev, cancelled } : ev))
      );
    },
    [onEventsChange]
  );

  const neoPlate: CSSProperties = {
    borderRadius: 28,
    background: styles.sectionBg,
    boxShadow: styles.cardShadow,
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.88)",
  };

  const neoInset: CSSProperties = {
    borderRadius: 16,
    background: styles.cardBg,
    boxShadow: styles.insetShadow,
  };

  const tooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  const neoBtn = (pressed?: boolean): CSSProperties =>
    pressed
      ? {
          border: "none",
          cursor: "pointer",
          borderRadius: 18,
          padding: "12px 20px",
          fontWeight: 700,
          fontSize: 14,
          color: styles.text,
          background: styles.cardBg,
          boxShadow: styles.insetShadow,
        }
      : {
          border: "none",
          cursor: "pointer",
          borderRadius: 18,
          padding: "12px 20px",
          fontWeight: 700,
          fontSize: 14,
          color: styles.text,
          background: styles.sectionBg,
          boxShadow: styles.cardShadow,
        };

  return (
    <section
      style={{
        ...neoPlate,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        flex: 1,
        minHeight: 0,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: styles.muted, marginBottom: 8 }}>
            Календарь
          </div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: styles.text }}>Мероприятия</h2>
          <p style={{ margin: "10px 0 0", maxWidth: 560, fontSize: 14, lineHeight: 1.6, color: styles.muted }}>
            Планируйте встречи и отраслевые события. Новые записи появляются в сетке выбранного месяца.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={goPrev} style={neoBtn(false)}>
            ←
          </button>
          <div
            style={{
              minWidth: 200,
              textAlign: "center",
              fontWeight: 700,
              fontSize: 16,
              color: styles.text,
              padding: "10px 16px",
              borderRadius: 16,
              ...neoInset,
            }}
          >
            {monthLabel}
          </div>
          <button type="button" onClick={goNext} style={neoBtn(false)}>
            →
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const lastD = new Date(year, monthIndex + 1, 0).getDate();
              const sameMonth =
                today.getFullYear() === year && today.getMonth() === monthIndex;
              const dayNum = sameMonth ? Math.min(today.getDate(), lastD) : Math.min(15, lastD);
              openCreate(toDateKey(year, monthIndex, dayNum));
            }}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 999,
              padding: "14px 22px",
              fontWeight: 700,
              fontSize: 14,
              background: styles.buttonBg,
              color: styles.buttonText,
              boxShadow: `${styles.cardShadow}, ${styles.insetShadow}`,
            }}
          >
            + Создать мероприятие
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            style={{
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: styles.muted,
              padding: "8px 4px",
            }}
          >
            {wd}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`e-${idx}`}
                style={{
                  minHeight: 92,
                  borderRadius: 18,
                  background: isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.35)",
                  boxShadow: styles.insetShadow,
                  opacity: 0.45,
                }}
              />
            );
          }
          const key = toDateKey(year, monthIndex, day);
          const dayEvents = eventsByDate.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => openCreate(key)}
              style={{
                minHeight: 92,
                borderRadius: 18,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                background: styles.cardBg,
                color: styles.text,
                boxShadow: styles.cardShadow,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, color: styles.text }}>{day}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
                {dayEvents.slice(0, 2).map((ev) => {
                  const isOff = Boolean(ev.cancelled);
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        minWidth: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        lineHeight: 1.25,
                        color: styles.muted,
                        padding: "4px 4px 4px 6px",
                        borderRadius: 8,
                        background: isOff
                          ? isDark
                            ? "rgba(148, 163, 184, 0.12)"
                            : "rgba(100, 116, 139, 0.14)"
                          : isDark
                            ? "rgba(79,128,243,0.15)"
                            : "rgba(68,197,182,0.18)",
                      }}
                    >
                      <HoverTooltip
                        preset={tooltipPreset}
                        isDark={isDark}
                        wrapperStyle={{ flex: 1, minWidth: 0 }}
                        content={
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                opacity: 0.72,
                              }}
                            >
                              Мероприятие
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{ev.title}</span>
                            <span style={{ fontWeight: 600, opacity: 0.88, fontSize: 11 }}>
                              {ev.time} · {AUDIENCE_LABELS[ev.audience]}
                            </span>
                            {ev.description.trim() ? (
                              <span
                                style={{
                                  fontWeight: 500,
                                  opacity: 0.9,
                                  fontSize: 11,
                                  lineHeight: 1.5,
                                  marginTop: 2,
                                  paddingTop: 8,
                                  borderTop: `1px solid ${isDark ? "rgba(148,163,184,0.25)" : "rgba(100,116,139,0.2)"}`,
                                }}
                              >
                                {ev.description}
                              </span>
                            ) : null}
                            {isOff ? (
                              <span style={{ color: "#f87171", fontSize: 11, fontWeight: 700 }}>Отменено</span>
                            ) : null}
                          </div>
                        }
                      >
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textDecoration: isOff ? "line-through" : undefined,
                            opacity: isOff ? 0.75 : 1,
                          }}
                        >
                          {ev.time} · {AUDIENCE_SHORT[ev.audience]} · {ev.title}
                        </span>
                      </HoverTooltip>
                      <HoverTooltip
                        preset={tooltipPreset}
                        isDark={isDark}
                        content={
                          <span style={{ whiteSpace: "nowrap" }}>
                            {isOff ? "Вернуть мероприятие" : "Отменить мероприятие"}
                          </span>
                        }
                      >
                        <button
                          type="button"
                          aria-label={isOff ? "Вернуть мероприятие" : "Отменить мероприятие"}
                          onClick={() => setEventCancelled(ev.id, !isOff)}
                          style={{
                            flexShrink: 0,
                            border: "none",
                            cursor: "pointer",
                            padding: "2px 5px",
                            borderRadius: 6,
                            fontSize: 13,
                            lineHeight: 1,
                            fontWeight: 400,
                            color: styles.muted,
                            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.65)",
                            fontFamily: "system-ui, Segoe UI, Roboto, sans-serif",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 22,
                            minHeight: 22,
                          }}
                        >
                          {isOff ? "↺" : "×"}
                        </button>
                      </HoverTooltip>
                    </div>
                  );
                })}
                {dayEvents.length > 2 ? (
                  <span style={{ fontSize: 10, color: styles.muted }}>+{dayEvents.length - 2}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {modalOpen ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(15, 23, 42, 0.45)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal
            aria-labelledby="event-dialog-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              borderRadius: 28,
              padding: 28,
              background: styles.surfaceBg,
              boxShadow: isDark
                ? "24px 28px 60px rgba(0,0,0,0.5), inset 1px 1px 0 rgba(255,255,255,0.06)"
                : "20px 24px 48px rgba(142, 154, 178, 0.28), -16px -16px 40px rgba(255,255,255,0.95), inset 1px 1px 0 rgba(255,255,255,0.9)",
              border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.9)",
            }}
          >
            <h3 id="event-dialog-title" style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: styles.text }}>
              Новое мероприятие
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: styles.muted }}>Заполните поля — событие появится в календаре.</p>

            <div style={{ marginBottom: 16 }}>
              <span
                id="event-audience-label"
                style={{ display: "block", fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 10 }}
              >
                Для кого мероприятие
              </span>
              <div
                role="radiogroup"
                aria-labelledby="event-audience-label"
                style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
              >
                {(
                  [
                    { key: "private" as const, label: "Частные" },
                    { key: "students" as const, label: "Студенты" },
                    { key: "schools" as const, label: "Школьники" },
                  ] as const
                ).map(({ key, label }) => {
                  const active = formAudience === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setFormAudience(key)}
                      style={{
                        flex: "1 1 100px",
                        minWidth: 0,
                        padding: "11px 12px",
                        borderRadius: 14,
                        border: active
                          ? "2px solid rgba(36, 59, 116, 0.35)"
                          : "1px solid rgba(255,255,255,0.85)",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 12,
                        color: styles.text,
                        fontFamily: "inherit",
                        background: active
                          ? isDark
                            ? "linear-gradient(160deg, #1e2f4d 0%, #1a2a45 100%)"
                            : "linear-gradient(160deg, #e4edfd 0%, #d9e5fb 100%)"
                          : isDark
                            ? "linear-gradient(145deg, #1c2b45 0%, #18243a 100%)"
                            : "linear-gradient(145deg, #f7f9ff 0%, #eef2fa 100%)",
                        boxShadow: active ? styles.insetShadow : styles.cardShadow,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 6 }}>Название</label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Например: Согласование с ТОУАД"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 14,
                padding: "12px 14px",
                borderRadius: 14,
                border: "none",
                fontSize: 14,
                color: styles.text,
                background: styles.inputBg,
                boxShadow: styles.insetShadow,
                outline: "none",
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 6 }}>Дата</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "none",
                    fontSize: 14,
                    color: styles.text,
                    background: styles.inputBg,
                    boxShadow: styles.insetShadow,
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 6 }}>Время</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "none",
                    fontSize: 14,
                    color: styles.text,
                    background: styles.inputBg,
                    boxShadow: styles.insetShadow,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 6 }}>Описание</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Кратко о цели встречи"
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 20,
                padding: "12px 14px",
                borderRadius: 14,
                border: "none",
                fontSize: 14,
                color: styles.text,
                background: styles.inputBg,
                boxShadow: styles.insetShadow,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button type="button" onClick={closeModal} style={{ ...neoBtn(false), color: styles.muted }}>
                Отмена
              </button>
              <button
                type="button"
                onClick={submitEvent}
                disabled={!formTitle.trim() || !formDate}
                style={{
                  border: "none",
                  cursor: formTitle.trim() && formDate ? "pointer" : "not-allowed",
                  opacity: formTitle.trim() && formDate ? 1 : 0.5,
                  borderRadius: 999,
                  padding: "12px 22px",
                  fontWeight: 700,
                  fontSize: 14,
                  background: styles.buttonBg,
                  color: styles.buttonText,
                  boxShadow: styles.insetShadow,
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
});
