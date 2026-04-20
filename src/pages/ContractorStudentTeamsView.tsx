import { memo, useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { listAllBulletinsForContractors, STUDENT_TEAMS_UPDATED_EVENT } from "../utils/sharedStudentTeamsStorage";

type ThemeStyles = {
  text: string;
  muted: string;
  cardBg: string;
  sectionBg: string;
  insetShadow: string;
  cardShadow: string;
};

type Props = {
  styles: ThemeStyles;
  layoutStyles: Record<string, CSSProperties>;
};

const ContractorStudentTeamsView = memo(function ContractorStudentTeamsView({ styles, layoutStyles }: Props) {
  const [items, setItems] = useState(() => listAllBulletinsForContractors());
  const sync = useCallback(() => setItems(listAllBulletinsForContractors()), []);

  useEffect(() => {
    sync();
    const h = () => sync();
    window.addEventListener(STUDENT_TEAMS_UPDATED_EVENT, h);
    return () => window.removeEventListener(STUDENT_TEAMS_UPDATED_EVENT, h);
  }, [sync]);

  return (
    <div style={{ ...(layoutStyles.recentPanel ?? {}), maxWidth: 900 }}>
      <div style={layoutStyles.recentTitle ?? {}}>Студенческие дорожные команды</div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: styles.muted, margin: "0 0 18px" }}>
        Материалы и объявления ассоциаций РАДОР и АДО для студенческих команд — только просмотр.
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: 20,
              borderRadius: 20,
              background: styles.sectionBg,
              boxShadow: styles.insetShadow,
              color: styles.muted,
              fontSize: 14,
            }}
          >
            Публикаций пока нет.
          </div>
        ) : (
          items.map((b) => (
            <div
              key={b.id}
              style={{
                padding: 18,
                borderRadius: 22,
                background: styles.cardBg,
                boxShadow: styles.cardShadow,
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: styles.muted, letterSpacing: "0.05em" }}>
                Ассоциация «{b.association === "ado" ? "АДО" : "РАДОР"}»
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: styles.text, marginTop: 6 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: styles.muted, marginTop: 6 }}>
                {new Date(b.createdAt).toLocaleString("ru-RU")}
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.65, color: styles.text, whiteSpace: "pre-wrap" }}>
                {b.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default ContractorStudentTeamsView;
