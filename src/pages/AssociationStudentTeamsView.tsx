import { memo, useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { AssociationId } from "../utils/sharedAssociationDocumentsStorage";
import {
  addBulletin,
  deleteBulletin,
  listBulletins,
  STUDENT_TEAMS_UPDATED_EVENT,
} from "../utils/sharedStudentTeamsStorage";

type ThemeStyles = {
  text: string;
  muted: string;
  cardBg: string;
  sectionBg: string;
  buttonBg: string;
  buttonText: string;
  insetShadow: string;
  cardShadow: string;
};

type Props = {
  styles: ThemeStyles;
  association: AssociationId;
  layoutStyles: { recentPanel: CSSProperties; recentTitle: CSSProperties };
};

const AssociationStudentTeamsView = memo(function AssociationStudentTeamsView({
  styles,
  association,
  layoutStyles,
}: Props) {
  const [items, setItems] = useState(() => listBulletins(association));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const sync = useCallback(() => setItems(listBulletins(association)), [association]);

  useEffect(() => {
    sync();
    const h = () => sync();
    window.addEventListener(STUDENT_TEAMS_UPDATED_EVENT, h);
    return () => window.removeEventListener(STUDENT_TEAMS_UPDATED_EVENT, h);
  }, [sync]);

  const short = association === "ado" ? "АДО" : "РАДОР";

  return (
    <div style={{ ...layoutStyles.recentPanel, maxWidth: 900 }}>
      <div style={layoutStyles.recentTitle}>Студенческие дорожные команды</div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: styles.muted, margin: "0 0 20px" }}>
        Публикуйте материалы и напоминания для команд: они отображаются в кабинете подрядчика в режиме просмотра.
      </p>

      <div
        style={{
          padding: 20,
          borderRadius: 24,
          background: styles.sectionBg,
          boxShadow: styles.insetShadow,
          marginBottom: 22,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: styles.text }}>Новое объявление</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(36,59,116,0.2)",
            marginBottom: 10,
            fontFamily: "inherit",
            background: styles.cardBg,
            color: styles.text,
          }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Текст для студенческих команд…"
          rows={5}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(36,59,116,0.2)",
            fontFamily: "inherit",
            resize: "vertical",
            background: styles.cardBg,
            color: styles.text,
            marginBottom: 10,
          }}
        />
        {err ? <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>{err}</div> : null}
        <button
          type="button"
          onClick={() => {
            setErr(null);
            if (!title.trim() || !body.trim()) {
              setErr("Заполните заголовок и текст.");
              return;
            }
            addBulletin(association, title, body);
            setTitle("");
            setBody("");
            sync();
          }}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "11px 20px",
            fontWeight: 700,
            cursor: "pointer",
            background: styles.buttonBg,
            color: styles.buttonText,
            fontFamily: "inherit",
          }}
        >
          Опубликовать
        </button>
      </div>

      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12, color: styles.text }}>Лента для команд ({short})</div>
      <div style={{ display: "grid", gap: 14 }}>
        {items.length === 0 ? (
          <div style={{ color: styles.muted, fontSize: 14 }}>Пока нет записей.</div>
        ) : (
          items.map((b) => (
            <div
              key={b.id}
              style={{
                padding: 18,
                borderRadius: 22,
                background: styles.cardBg,
                boxShadow: styles.cardShadow,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: styles.text }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: styles.muted, marginTop: 6 }}>
                    {new Date(b.createdAt).toLocaleString("ru-RU")}
                  </div>
                  <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.65, color: styles.text, whiteSpace: "pre-wrap" }}>
                    {b.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    deleteBulletin(b.id);
                    sync();
                  }}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: "rgba(185,28,28,0.12)",
                    color: "#b91c1c",
                    fontFamily: "inherit",
                    flexShrink: 0,
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default AssociationStudentTeamsView;
