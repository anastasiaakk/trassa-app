import { memo, useEffect, useMemo, useState } from "react";

const cards = [
  {
    title: "Заявки РАДОР",
    description: "Контроль статусов, ответственных и сроков по каждой заявке.",
    accent: "#6366f1",
  },
  {
    title: "Документы",
    description: "Удобный доступ к актам, договорам и внутренним регламентам.",
    accent: "#0ea5e9",
  },
  {
    title: "Мероприятия",
    description: "Планируйте встречи, совещания и обучающие сессии в одном интерфейсе.",
    accent: "#f97316",
  },
];

const Page5Neumorphism = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [query, setQuery] = useState("");

  const isDark = theme === "dark";

  const themeStyles = useMemo(
    () => ({
      page: isDark ? "#0f172a" : "#eef2ff",
      surface: isDark ? "#111827" : "#e5ecff",
      card: isDark ? "#16202b" : "#f8fbff",
      text: isDark ? "#f8fafc" : "#0f172a",
      muted: isDark ? "#94a3b8" : "#64748b",
      accent: isDark ? "#6366f1" : "#2563eb",
      shadow: isDark
        ? "20px 20px 40px rgba(0, 0, 0, 0.45), -20px -20px 40px rgba(30, 41, 59, 0.25)"
        : "20px 20px 40px rgba(148, 163, 184, 0.25), -20px -20px 40px rgba(255, 255, 255, 0.85)",
      inset: isDark
        ? "inset 8px 8px 20px rgba(0, 0, 0, 0.3), inset -8px -8px 20px rgba(67, 56, 202, 0.1)"
        : "inset 10px 10px 20px rgba(255, 255, 255, 0.8), inset -10px -10px 20px rgba(148, 163, 184, 0.25)",
    }),
    [isDark]
  );

  useEffect(() => {
    document.body.style.backgroundColor = themeStyles.page;
  }, [themeStyles.page]);

  const visibleCards = useMemo(
    () =>
      cards.filter((card) =>
        card.title.toLowerCase().includes(query.toLowerCase()) ||
        card.description.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: themeStyles.page,
        color: themeStyles.text,
        fontFamily: "Inter, sans-serif",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "grid",
          gap: 28,
        }}
      >
        <header
          style={{
            padding: 28,
            borderRadius: 34,
            background: themeStyles.surface,
            boxShadow: themeStyles.shadow,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 42 }}>РАДОР</h1>
            <p style={{ margin: "12px 0 0", color: themeStyles.muted, maxWidth: 640 }}>
              Гибкая панель управления ассоциации в актуальном неоморфическом стиле.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            style={{
              border: "none",
              borderRadius: 24,
              padding: "14px 22px",
              background: themeStyles.card,
              color: themeStyles.text,
              boxShadow: themeStyles.inset,
              cursor: "pointer",
            }}
          >
            {isDark ? "Светлая тема" : "Тёмная тема"}
          </button>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 24,
            }}
          >
            <div
              style={{
                padding: 28,
                borderRadius: 34,
                background: themeStyles.surface,
                boxShadow: themeStyles.shadow,
              }}
            >
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск по разделам"
                  style={{
                    flex: 1,
                    borderRadius: 22,
                    padding: "18px 22px",
                    border: "none",
                    background: themeStyles.card,
                    color: themeStyles.text,
                    boxShadow: themeStyles.inset,
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  style={{
                    border: "none",
                    borderRadius: 22,
                    padding: "16px 20px",
                    background: themeStyles.card,
                    color: themeStyles.text,
                    boxShadow: themeStyles.inset,
                    cursor: "pointer",
                  }}
                >
                  Очистить
                </button>
              </div>
            </div>

            {visibleCards.map((card) => (
              <div
                key={card.title}
                style={{
                  padding: 26,
                  borderRadius: 30,
                  background: themeStyles.card,
                  boxShadow: themeStyles.inset,
                  border: `1px solid ${card.accent}25`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{card.title}</span>
                  <span
                    style={{
                      color: "white",
                      background: card.accent,
                      padding: "8px 14px",
                      borderRadius: 18,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Актуально
                  </span>
                </div>
                <p style={{ margin: "14px 0 0", color: themeStyles.muted }}>{card.description}</p>
              </div>
            ))}

            {visibleCards.length === 0 && (
              <div
                style={{
                  padding: 26,
                  borderRadius: 30,
                  background: themeStyles.card,
                  boxShadow: themeStyles.inset,
                }}
              >
                <p style={{ margin: 0, color: themeStyles.muted }}>
                  Ничего не найдено по запросу.
                </p>
              </div>
            )}
          </div>

          <aside
            style={{
              display: "grid",
              gap: 20,
            }}
          >
            <div
              style={{
                padding: 26,
                borderRadius: 34,
                background: themeStyles.surface,
                boxShadow: themeStyles.shadow,
              }}
            >
              <p style={{ margin: 0, color: themeStyles.muted, textTransform: "uppercase", fontSize: 12 }}>
                Быстрые настройки
              </p>
              <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
                <button
                  type="button"
                  style={{
                    border: "none",
                    borderRadius: 22,
                    padding: "16px 20px",
                    background: themeStyles.card,
                    color: themeStyles.text,
                    boxShadow: themeStyles.inset,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  Создать новую заявку
                </button>
                <button
                  type="button"
                  style={{
                    border: "none",
                    borderRadius: 22,
                    padding: "16px 20px",
                    background: themeStyles.card,
                    color: themeStyles.text,
                    boxShadow: themeStyles.inset,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  Просмотреть документы
                </button>
              </div>
            </div>

            <div
              style={{
                padding: 26,
                borderRadius: 34,
                background: themeStyles.surface,
                boxShadow: themeStyles.shadow,
              }}
            >
              <p style={{ margin: 0, color: themeStyles.muted, textTransform: "uppercase", fontSize: 12 }}>
                Статус системы
              </p>
              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: themeStyles.text }}>
                  <span>Сетевой доступ</span>
                  <strong style={{ color: themeStyles.accent }}>OK</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: themeStyles.text }}>
                  <span>Документы</span>
                  <strong style={{ color: themeStyles.accent }}>142</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: themeStyles.text }}>
                  <span>Заявки</span>
                  <strong style={{ color: themeStyles.accent }}>68</strong>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default memo(Page5Neumorphism);
