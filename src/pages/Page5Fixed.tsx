import { memo, useEffect, useMemo, useState } from "react";

const cards = [
  {
    title: "Заявки РАДОР",
    description: "Просмотр и обработка заявок, контроль сроков и статусов.",
    accent: "#4f80f3",
    icon: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/b3pnceya_expires_30_days.png",
    tag: "Заявки",
  },
  {
    title: "Документы",
    description: "Управление договорами, актами и инструкциями для членов ассоциации.",
    accent: "#44c5b6",
    icon: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/66h5rmum_expires_30_days.png",
    tag: "Документы",
  },
  {
    title: "Мероприятия",
    description: "Планирование и отчётность по событиям, совещаниям и обучению.",
    accent: "#fbbf24",
    icon: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/0tenwd9b_expires_30_days.png",
    tag: "Мероприятия",
  },
  {
    title: "Контроль качества",
    description: "Аналитика по проектам и удобный доступ к KPI и результатам инспекций.",
    accent: "#ef4444",
    icon: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/KMgTjwx8lt/boty0uwi_expires_30_days.png",
    tag: "Аналитика",
  },
];

const Page5 = () => {
  const [searchValue, setSearchValue] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const isDark = theme === "dark";

  const themeStyles = useMemo(
    () => ({
      pageBackground: isDark ? "#0f172a" : "#eef2ff",
      pageColor: isDark ? "#f8fafc" : "#0f172a",
      panelBackground: isDark ? "#16202f" : "#ffffff",
      cardBackground: isDark ? "#1f2a3d" : "#f8fafc",
      accentBackground: isDark ? "#23304a" : "#eef4ff",
      buttonBg: isDark ? "#2563eb" : "#1d4ed8",
      buttonColor: "#ffffff",
      mutedText: isDark ? "#94a3b8" : "#475569",
      boxShadow: isDark
        ? "20px 20px 40px rgba(0, 0, 0, 0.25)"
        : "20px 20px 40px rgba(148, 163, 184, 0.18)",
      insetShadow: isDark
        ? "inset 8px 8px 18px rgba(0, 0, 0, 0.18)"
        : "inset 8px 8px 18px rgba(203, 213, 225, 0.45)",
    }),
    [isDark]
  );

  useEffect(() => {
    document.body.style.backgroundColor = themeStyles.pageBackground;
  }, [themeStyles.pageBackground]);

  const filteredCards = useMemo(
    () =>
      cards.filter((card) =>
        card.title.toLowerCase().includes(searchValue.toLowerCase()) ||
        card.description.toLowerCase().includes(searchValue.toLowerCase()) ||
        card.tag.toLowerCase().includes(searchValue.toLowerCase())
      ),
    [searchValue]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: themeStyles.pageBackground,
        color: themeStyles.pageColor,
        fontFamily: "Inter, sans-serif",
        padding: "24px",
        transition: "background 0.35s ease, color 0.35s ease",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 24,
            borderRadius: 32,
            background: themeStyles.panelBackground,
            boxShadow: themeStyles.boxShadow,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 32 }}>Рабочий контур РАДОР</h1>
            <p style={{ margin: "12px 0 0", color: themeStyles.mutedText }}>
              Управляйте заявками, документами и мероприятиями для ассоциации.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            style={{
              border: "none",
              background: themeStyles.buttonBg,
              color: themeStyles.buttonColor,
              padding: "14px 18px",
              borderRadius: 24,
              cursor: "pointer",
              boxShadow: themeStyles.insetShadow,
            }}
          >
            Тема: {isDark ? "тёмная" : "светлая"}
          </button>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 28,
            alignItems: "start",
          }}
        >
          <div
            style={{
              padding: 28,
              borderRadius: 36,
              background: themeStyles.panelBackground,
              boxShadow: themeStyles.boxShadow,
            }}
          >
            <div style={{ marginBottom: 24, display: "flex", gap: 16, alignItems: "center" }}>
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Поиск по странице"
                style={{
                  flex: 1,
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  borderRadius: 20,
                  padding: "16px 18px",
                  background: themeStyles.accentBackground,
                  color: themeStyles.pageColor,
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: 20,
              }}
            >
              {filteredCards.map((card) => (
                <div
                  key={card.title}
                  style={{
                    padding: 24,
                    borderRadius: 28,
                    background: themeStyles.cardBackground,
                    boxShadow: themeStyles.insetShadow,
                    border: `1px solid ${card.accent}20`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <img src={card.icon} alt={card.tag} style={{ width: 28, height: 28 }} />
                    <span style={{ color: card.accent, fontWeight: 700 }}>{card.tag}</span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 22 }}>{card.title}</h2>
                  <p style={{ margin: "10px 0 0", color: themeStyles.mutedText }}>{card.description}</p>
                </div>
              ))}

              {filteredCards.length === 0 && (
                <div style={{ padding: 24, borderRadius: 28, background: themeStyles.cardBackground }}>
                  Нет результатов по запросу.
                </div>
              )}
            </div>
          </div>

          <aside
            style={{
              display: "grid",
              gap: 20,
              padding: 28,
              borderRadius: 36,
              background: themeStyles.panelBackground,
              boxShadow: themeStyles.boxShadow,
            }}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <span style={{ color: themeStyles.mutedText, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                Быстрые действия
              </span>
              <button
                type="button"
                style={{
                  border: "none",
                  background: themeStyles.buttonBg,
                  color: themeStyles.buttonColor,
                  borderRadius: 24,
                  padding: "16px",
                  cursor: "pointer",
                }}
              >
                Создать заявку
              </button>
              <button
                type="button"
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  background: "transparent",
                  color: themeStyles.pageColor,
                  borderRadius: 24,
                  padding: "16px",
                  cursor: "pointer",
                }}
              >
                Загрузить документ
              </button>
            </div>

            <div style={{ padding: 20, borderRadius: 28, background: themeStyles.accentBackground }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Статус обслуживания</h3>
              <p style={{ margin: "12px 0 0", color: themeStyles.pageColor }}>
                Система работает стабильно. Все модули доступны.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default memo(Page5);
