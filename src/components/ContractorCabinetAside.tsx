import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import CabinetHomeIcon from "./CabinetHomeIcon";
import type { CabinetChromeStyles } from "./CabinetChromeLayout";

type LayoutStyles = Record<string, CSSProperties>;

type Props = {
  styles: CabinetChromeStyles;
  layoutStyles: LayoutStyles;
  /** Текущий раздел кабинета подрядчика */
  active: "home" | "proforientation" | "documents" | "teams";
};

/** Левая колонка: «Главная» и плашка профориентации (отдельная страница). */
export function ContractorCabinetAside({ styles, layoutStyles, active }: Props) {
  const navigate = useNavigate();

  /** Рамка всегда 2px, чтобы при смене active не менялась геометрия плашки. */
  const navBorder = (on: boolean) => (on ? `2px solid ${styles.buttonBg}` : "2px solid transparent");

  return (
    <aside style={layoutStyles.aside}>
      <button
        type="button"
        onClick={() => navigate("/page4")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 18px",
          borderRadius: 28,
          width: "100%",
          boxSizing: "border-box",
          border: navBorder(active === "home"),
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          background: active === "home" ? styles.cardBg : styles.sectionBg,
          color: styles.text,
          fontWeight: 700,
          boxShadow: active === "home" ? styles.insetShadow : styles.cardShadow,
        }}
      >
        <CabinetHomeIcon size={22} color={styles.text} />
        <span style={{ flex: 1, minWidth: 0 }}>Главная</span>
        <span
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            minWidth: 44,
          }}
          aria-hidden={active !== "home"}
        >
          <span
            style={{
              background: styles.sectionBg,
              color: styles.text,
              fontWeight: 700,
              borderRadius: 9999,
              padding: "6px 14px",
              fontSize: 12,
              opacity: active === "home" ? 1 : 0,
            }}
          >
            2
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/page4/teams")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 18px",
          borderRadius: 28,
          width: "100%",
          boxSizing: "border-box",
          border: navBorder(active === "teams"),
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          background: active === "teams" ? styles.cardBg : styles.sectionBg,
          color: styles.text,
          boxShadow: active === "teams" ? styles.insetShadow : styles.cardShadow,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: styles.muted, marginBottom: 4 }}>
            КОМАНДЫ
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>Студенческие дорожные команды</div>
          <div style={{ fontSize: 12, color: styles.muted, marginTop: 4, lineHeight: 1.35 }}>
            Материалы ассоциаций РАДОР и АДО
          </div>
        </div>
        <span style={{ fontSize: 18, color: styles.buttonBg, flexShrink: 0 }} aria-hidden>
          →
        </span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/page4/documents")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 18px",
          borderRadius: 28,
          width: "100%",
          boxSizing: "border-box",
          border: navBorder(active === "documents"),
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          background: active === "documents" ? styles.cardBg : styles.sectionBg,
          color: styles.text,
          boxShadow: active === "documents" ? styles.insetShadow : styles.cardShadow,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: styles.muted, marginBottom: 4 }}>
            ДОКУМЕНТЫ
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>Шаблоны ассоциаций</div>
          <div style={{ fontSize: 12, color: styles.muted, marginTop: 4, lineHeight: 1.35 }}>
            Заполнить и отправить ответ
          </div>
        </div>
        <span style={{ fontSize: 18, color: styles.buttonBg, flexShrink: 0 }} aria-hidden>
          →
        </span>
      </button>

      <button
        type="button"
        onClick={() => navigate("/page4/proforientation")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 18px",
          borderRadius: 28,
          width: "100%",
          boxSizing: "border-box",
          border: navBorder(active === "proforientation"),
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          background: active === "proforientation" ? styles.cardBg : styles.sectionBg,
          color: styles.text,
          boxShadow: active === "proforientation" ? styles.insetShadow : styles.cardShadow,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: styles.muted, marginBottom: 4 }}>
            ПРОФОРИЕНТАЦИЯ
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>Результаты теста и подбор кадров</div>
          <div style={{ fontSize: 12, color: styles.muted, marginTop: 4, lineHeight: 1.35 }}>
            Школьники и студенты — открыть отчёт
          </div>
        </div>
        <span style={{ fontSize: 18, color: styles.buttonBg, flexShrink: 0 }} aria-hidden>
          →
        </span>
      </button>

      <div style={layoutStyles.sideCard}>
        <div style={{ fontSize: 12, color: styles.muted, marginBottom: 10 }}>Статус проекта</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Отчёт за июнь 2026</div>
        <div style={{ fontSize: 14, color: styles.muted, lineHeight: 1.7 }}>
          Оптимизируйте работу команды и планируйте задачи подрядчика в одном месте. Получайте прозрачный контроль и
          мгновенные обновления.
        </div>
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        <button type="button" style={layoutStyles.sideBlock}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Письма и уведомления</div>
          <div style={{ fontSize: 13, color: styles.muted }}>
            Открыть список писем и увидеть последние запросы.
          </div>
        </button>
        <button type="button" style={layoutStyles.sideBlock}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Таблица практики</div>
          <div style={{ fontSize: 13, color: styles.muted }}>
            Открыть таблицу, которую администратор может редактировать и наполнять.
          </div>
        </button>
      </div>
    </aside>
  );
}
