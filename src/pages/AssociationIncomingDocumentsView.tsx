import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { AssociationId } from "../utils/sharedAssociationDocumentsStorage";
import {
  getDocument,
  listIncomingDocumentsForAssociation,
  markAllNotificationsRead,
  markNotificationReadForSubmissionId,
  SHARED_DOCS_UPDATED_EVENT,
} from "../utils/sharedAssociationDocumentsStorage";

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
  /** Например `/page5` или `/page6` */
  basePath: string;
};

const AssociationIncomingDocumentsView = memo(function AssociationIncomingDocumentsView({
  styles,
  association,
  layoutStyles,
  basePath,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const documentsPath = `${basePath}/documents`;
  const [incoming, setIncoming] = useState(() => listIncomingDocumentsForAssociation(association));
  const [openIncomingId, setOpenIncomingId] = useState<string | null>(null);

  const sync = useCallback(() => {
    setIncoming(listIncomingDocumentsForAssociation(association));
  }, [association]);

  useEffect(() => {
    sync();
    const on = () => sync();
    window.addEventListener(SHARED_DOCS_UPDATED_EVENT, on);
    return () => window.removeEventListener(SHARED_DOCS_UPDATED_EVENT, on);
  }, [sync]);

  useEffect(() => {
    const sid = new URLSearchParams(location.search).get("openSubmission");
    if (!sid) return;
    setOpenIncomingId(sid);
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
  }, [location.search, location.pathname, navigate]);

  useEffect(() => {
    if (!openIncomingId) return;
    const t = window.setTimeout(() => {
      document.getElementById(`incoming-sub-${openIncomingId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
    return () => clearTimeout(t);
  }, [openIncomingId]);

  const unreadIncoming = useMemo(
    () => incoming.filter((row) => row.notification && !row.notification.read).length,
    [incoming]
  );

  const openInPlaced = useCallback(
    (documentId: string) => {
      navigate(`${documentsPath}?open=${encodeURIComponent(documentId)}`);
    },
    [navigate, documentsPath]
  );

  return (
    <div
      style={{
        ...layoutStyles.recentPanel,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => navigate(documentsPath)}
          style={{
            border: `1px solid rgba(36,59,116,0.35)`,
            borderRadius: 999,
            padding: "8px 14px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            background: styles.sectionBg,
            fontFamily: "inherit",
            color: styles.text,
            flexShrink: 0,
          }}
        >
          ← Документооборот
        </button>
        <div style={{ ...layoutStyles.recentTitle, margin: 0, flex: "1 1 200px" }}>Входящие документы</div>
        {unreadIncoming > 0 ? (
          <button
            type="button"
            onClick={() => {
              markAllNotificationsRead(association);
              sync();
            }}
            style={{
              border: "none",
              background: "transparent",
              color: styles.muted,
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Отметить все прочитанными
          </button>
        ) : null}
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.55, color: styles.muted, margin: "0 0 18px" }}>
        Ответы подрядчиков по размещённым документам. Нажмите строку, чтобы раскрыть текст; кнопка ниже откроет карточку в
        основном списке.
      </p>

      {incoming.length === 0 ? (
        <div style={{ fontSize: 14, color: styles.muted, lineHeight: 1.55 }}>
          Пока нет входящих ответов. После отправки подрядчиком они появятся здесь.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0, overflowY: "auto" }}>
          {incoming.map(({ submission: s, document: d, notification: n }) => {
            const isUnread = n && !n.read;
            const isOpen = openIncomingId === s.id;
            return (
              <div
                key={s.id}
                id={`incoming-sub-${s.id}`}
                style={{
                  borderRadius: 16,
                  border: isUnread ? `1px solid rgba(79, 128, 243, 0.4)` : `1px solid rgba(100,116,140,0.12)`,
                  background: styles.cardBg,
                  boxShadow: styles.cardShadow,
                  overflow: "hidden",
                  scrollMarginTop: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    markNotificationReadForSubmissionId(s.id);
                    setOpenIncomingId((prev) => (prev === s.id ? null : s.id));
                    sync();
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 16px",
                    border: "none",
                    background: isOpen ? "rgba(79, 128, 243, 0.06)" : "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800, color: styles.text, lineHeight: 1.3 }}>
                    {d.title}
                    {isUnread ? (
                      <span style={{ color: styles.buttonBg, marginLeft: 6, fontSize: 12 }}>● новое</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 13, color: styles.muted, marginTop: 6 }}>
                    {s.contractorDisplayName || s.contractorEmailNorm} · {s.contractorEmailNorm}
                  </div>
                  <div style={{ fontSize: 12, color: styles.muted, marginTop: 4 }}>
                    {new Date(s.submittedAt).toLocaleString("ru-RU")}
                  </div>
                </button>
                {isOpen ? (
                  <div
                    style={{
                      padding: "0 16px 16px",
                      borderTop: `1px solid rgba(100,116,140,0.12)`,
                    }}
                  >
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        fontFamily: "inherit",
                        fontSize: 14,
                        lineHeight: 1.55,
                        margin: "12px 0 0",
                        color: styles.text,
                        wordBreak: "break-word",
                      }}
                    >
                      {s.filledContent}
                    </pre>
                    {s.contractorAttachment ? (
                      <div style={{ marginTop: 12 }}>
                        <a
                          href={s.contractorAttachment.dataUrl}
                          download={s.contractorAttachment.name}
                          style={{ fontWeight: 700, color: styles.buttonBg, fontSize: 14 }}
                        >
                          {s.contractorAttachment.name}
                        </a>
                      </div>
                    ) : null}
                    {getDocument(d.id) ? (
                      <button
                        type="button"
                        onClick={() => openInPlaced(d.id)}
                        style={{
                          marginTop: 14,
                          border: "none",
                          borderRadius: 999,
                          padding: "10px 18px",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          background: styles.buttonBg,
                          color: styles.buttonText,
                          fontFamily: "inherit",
                        }}
                      >
                        Открыть в размещённых документах
                      </button>
                    ) : (
                      <div
                        style={{
                          marginTop: 14,
                          fontSize: 13,
                          color: styles.muted,
                          lineHeight: 1.45,
                        }}
                      >
                        Документ снят с публикации; ответ сохранён только во входящих.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default AssociationIncomingDocumentsView;
