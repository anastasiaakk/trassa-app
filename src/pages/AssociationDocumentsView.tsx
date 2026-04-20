import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { AssociationId } from "../utils/sharedAssociationDocumentsStorage";
import {
  addDocument,
  CONTRACTOR_DOCUMENT_AI_NOTIFY_EVENT,
  listDocuments,
  listIncomingDocumentsForAssociation,
  listSubmissionsForDocument,
  markNotificationReadForSubmissionId,
  removeDocument,
  SHARED_ASSOCIATION_DOCS_STORAGE_KEY,
  SHARED_DOCS_UPDATED_EVENT,
  unreadNotificationCount,
  type AssociationDocument,
  type ContractorDocumentAiNotifyDetail,
  type IncomingDocumentItem,
} from "../utils/sharedAssociationDocumentsStorage";

const PENDING_AI_SESSION_KEY = "trassa-pending-doc-ai-toast";
const RECENT_INCOMING_LIMIT = 3;

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
  incomingDocumentsPath: string;
  isDark?: boolean;
};

function fileToDataUrl(file: File): Promise<{ name: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () =>
      resolve({ name: file.name, dataUrl: typeof r.result === "string" ? r.result : "" });
    r.onerror = () => reject(new Error("Файл не прочитан"));
    r.readAsDataURL(file);
  });
}

async function applyFile(f: File | undefined, onError: (msg: string) => void) {
  if (!f) return null;
  try {
    return await fileToDataUrl(f);
  } catch {
    onError("Не удалось прочитать файл.");
    return null;
  }
}

const AssociationDocumentsView = memo(function AssociationDocumentsView({
  styles,
  association,
  layoutStyles,
  incomingDocumentsPath,
  isDark = false,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unreadPrevRef = useRef<number | null>(null);

  const documentsMainPath = useMemo(
    () => incomingDocumentsPath.replace(/\/incoming\/?$/, ""),
    [incomingDocumentsPath]
  );

  const [docs, setDocs] = useState(() => listDocuments(association));
  const [incomingTop, setIncomingTop] = useState<IncomingDocumentItem[]>(() =>
    listIncomingDocumentsForAssociation(association).slice(0, RECENT_INCOMING_LIMIT)
  );
  const [unreadIncoming, setUnreadIncoming] = useState(() => unreadNotificationCount(association));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("");
  const [instFile, setInstFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [fileDrag, setFileDrag] = useState(false);
  const [aiNotice, setAiNotice] = useState<{ title: string; text: string } | null>(null);

  const sync = useCallback(() => {
    setDocs(listDocuments(association));
    setIncomingTop(listIncomingDocumentsForAssociation(association).slice(0, RECENT_INCOMING_LIMIT));
    setUnreadIncoming(unreadNotificationCount(association));
  }, [association]);

  const showAiNotice = useCallback((text: string) => {
    setAiNotice({
      title: "ИИ‑ассистент",
      text,
    });
  }, []);

  useEffect(() => {
    sync();
    const on = () => sync();
    window.addEventListener(SHARED_DOCS_UPDATED_EVENT, on);
    return () => window.removeEventListener(SHARED_DOCS_UPDATED_EVENT, on);
  }, [sync]);

  /** Плашка после отправки ответа в том же окне (sessionStorage). */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_AI_SESSION_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as {
        association: AssociationId;
        documentTitle: string;
        contractorLabel: string;
        at: number;
      };
      if (p.association !== association || Date.now() - p.at > 120_000) {
        sessionStorage.removeItem(PENDING_AI_SESSION_KEY);
        return;
      }
      showAiNotice(
        `Поступил ответ по документу «${p.documentTitle}» от подрядчика ${p.contractorLabel}. Откройте входящие или список ниже.`
      );
      sessionStorage.removeItem(PENDING_AI_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [association, showAiNotice]);

  useEffect(() => {
    const onAi = (e: Event) => {
      const ce = e as CustomEvent<ContractorDocumentAiNotifyDetail>;
      const d = ce.detail;
      if (!d || d.association !== association) return;
      showAiNotice(
        `Поступил ответ по документу «${d.documentTitle}» от ${d.contractorLabel}. Рекомендую проверить входящие.`
      );
    };
    window.addEventListener(CONTRACTOR_DOCUMENT_AI_NOTIFY_EVENT, onAi);
    return () => window.removeEventListener(CONTRACTOR_DOCUMENT_AI_NOTIFY_EVENT, onAi);
  }, [association, showAiNotice]);

  /** Другая вкладка: подрядчик отправил ответ — localStorage обновился. */
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== SHARED_ASSOCIATION_DOCS_STORAGE_KEY || ev.newValue == null) return;
      sync();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [sync]);

  useEffect(() => {
    if (unreadPrevRef.current === null) {
      unreadPrevRef.current = unreadIncoming;
      return;
    }
    if (unreadIncoming > unreadPrevRef.current) {
      showAiNotice(
        "Поступил новый ответ от подрядчика по документообороту. Три последних ответа — на плашке ниже, полный список — во «Входящие документы»."
      );
    }
    unreadPrevRef.current = unreadIncoming;
  }, [unreadIncoming, showAiNotice]);

  useEffect(() => {
    if (!aiNotice) return;
    const t = window.setTimeout(() => setAiNotice(null), 14000);
    return () => clearTimeout(t);
  }, [aiNotice]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("open");
    if (!id) return;
    setExpandedDocId(id);
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
  }, [location.search, location.pathname, navigate]);

  /** После открытия карточки (из плашки или ?open=) прокрутить страницу к размещённому документу. */
  useEffect(() => {
    if (!expandedDocId) return;
    const anchor = `association-placed-doc-${expandedDocId}`;
    const t = window.setTimeout(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(t);
  }, [expandedDocId]);

  const handleCreate = useCallback(() => {
    setError(null);
    if (!title.trim()) {
      setError("Укажите название документа.");
      return;
    }
    if (!template.trim()) {
      setError("Добавьте шаблон или инструкцию для подрядчика.");
      return;
    }
    addDocument(association, {
      title: title.trim(),
      description: description.trim(),
      templateForContractor: template.trim(),
      instituteAttachment: instFile ?? undefined,
    });
    setTitle("");
    setDescription("");
    setTemplate("");
    setInstFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    sync();
  }, [association, title, description, template, instFile, sync]);

  const onPickFile = useCallback(
    async (file: File | undefined) => {
      setError(null);
      const data = await applyFile(file, setError);
      setInstFile(data);
    },
    []
  );

  const fieldBase = useMemo(
    () =>
      ({
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box" as const,
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(36,59,116,0.2)",
        fontFamily: "inherit",
        fontSize: 14,
        background: styles.cardBg,
        color: styles.text,
      }) satisfies CSSProperties,
    [styles.cardBg, styles.text]
  );

  const sidePlaqueShell = useMemo(
    () => ({
      padding: 28,
      borderRadius: 36,
      background: styles.cardBg,
      boxShadow: styles.cardShadow,
      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.8)",
      boxSizing: "border-box" as const,
    }),
    [styles.cardBg, styles.cardShadow, isDark]
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
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 28,
          alignItems: "flex-start",
          flex: 1,
          minHeight: 0,
        }}
      >
        <section
          style={{
            flex: "1 1 480px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            paddingRight: 4,
          }}
        >
          <div style={{ ...layoutStyles.recentTitle, margin: 0 }}>Документооборот с подрядчиками</div>

          {aiNotice ? (
            <div
              role="status"
              style={{
                padding: "14px 18px",
                borderRadius: 18,
                background: "linear-gradient(135deg, rgba(79, 128, 243, 0.12) 0%, rgba(36, 59, 116, 0.08) 100%)",
                border: "1px solid rgba(79, 128, 243, 0.35)",
                boxShadow: styles.cardShadow,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: styles.sectionBg,
                    boxShadow: styles.insetShadow,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  ✦
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: styles.buttonBg, marginBottom: 4 }}>
                    {aiNotice.title}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: styles.text }}>{aiNotice.text}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiNotice(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: styles.muted,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  flexShrink: 0,
                }}
              >
                Закрыть
              </button>
            </div>
          ) : null}

          <p style={{ fontSize: 14, lineHeight: 1.55, color: styles.muted, margin: 0 }}>
            Опубликуйте шаблон — подрядчик заполнит его в своём кабинете. Входящие ответы — в плашках справа, как
            ближайшие мероприятия на главной.
          </p>

          <div
            style={{
              padding: 22,
              borderRadius: 24,
              background: styles.sectionBg,
              boxShadow: styles.insetShadow,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, color: styles.text }}>
              Новый документ для подрядчиков
            </div>
            <div style={{ fontSize: 13, color: styles.muted, marginBottom: 18, lineHeight: 1.45 }}>
              Заполните поля — документ сразу станет доступен подрядчикам в разделе документов.
            </div>

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 6 }}>
              Название
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...fieldBase, marginBottom: 14 }}
            />

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 6 }}>
              Краткое описание
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...fieldBase, marginBottom: 14 }}
            />

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 6 }}>
              Шаблон / поля для подрядчика
            </label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={5}
              style={{
                ...fieldBase,
                resize: "vertical",
                marginBottom: 16,
                minHeight: 100,
                maxHeight: 220,
              }}
            />

            <div style={{ fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 8 }}>Файл для подрядчика</div>
            <input
              ref={fileInputRef}
              type="file"
              tabIndex={-1}
              onChange={async (e) => {
                await onPickFile(e.target.files?.[0]);
              }}
              style={{ display: "none" }}
            />
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setFileDrag(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setFileDrag(false);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setFileDrag(false);
                const f = e.dataTransfer.files?.[0];
                await onPickFile(f);
              }}
              style={{
                borderRadius: 18,
                border: fileDrag
                  ? `2px dashed ${styles.buttonBg}`
                  : "2px dashed rgba(36, 59, 116, 0.28)",
                background: fileDrag ? "rgba(79, 128, 243, 0.08)" : styles.cardBg,
                padding: "18px 16px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
                marginBottom: instFile ? 12 : 14,
              }}
            >
              <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>📎</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: styles.text }}>
                Перетащите файл сюда или нажмите для выбора
              </div>
              <div style={{ fontSize: 12, color: styles.muted, marginTop: 6, lineHeight: 1.45 }}>
                PDF, изображения, архивы — один файл, до разумного размера
              </div>
            </div>

            {instFile ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 14,
                  background: "rgba(79, 128, 243, 0.1)",
                  border: "1px solid rgba(79, 128, 243, 0.25)",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: styles.text, wordBreak: "break-word" }}>
                  {instFile.name}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInstFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: "rgba(185, 28, 28, 0.12)",
                    color: "#b91c1c",
                    fontFamily: "inherit",
                    flexShrink: 0,
                  }}
                >
                  Убрать
                </button>
              </div>
            ) : null}

            {error ? <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 10 }}>{error}</div> : null}
            <button
              type="button"
              onClick={handleCreate}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "12px 24px",
                fontWeight: 700,
                cursor: "pointer",
                background: styles.buttonBg,
                color: styles.buttonText,
                fontFamily: "inherit",
              }}
            >
              Опубликовать документ
            </button>
          </div>

          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 8, marginBottom: 12, color: styles.text }}>
            Размещённые документы
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {docs.length === 0 ? (
              <div style={{ fontSize: 14, color: styles.muted }}>Пока нет документов — создайте первый блоком выше.</div>
            ) : (
              docs.map((d) => (
                <DocumentCardGov
                  key={d.id}
                  scrollAnchorId={`association-placed-doc-${d.id}`}
                  doc={d}
                  expanded={expandedDocId === d.id}
                  onToggle={() => setExpandedDocId((x) => (x === d.id ? null : d.id))}
                  onRemove={() => {
                    removeDocument(d.id);
                    sync();
                  }}
                  styles={styles}
                />
              ))
            )}
          </div>
        </section>

        <aside
          style={{
            flex: "0 1 340px",
            width: 340,
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 22,
            minWidth: 0,
            alignSelf: "flex-start",
          }}
        >
          <div style={sidePlaqueShell}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: styles.text }}>
              Новые ответы от подрядчика
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {incomingTop.length === 0 ? (
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
                  Входящих ответов пока нет. После отправки подрядчиком они появятся здесь — три последних по дате.
                </div>
              ) : (
                incomingTop.map(({ submission: s, document: d, notification: n }) => {
                  const isUnread = n && !n.read;
                  const dateLabel = new Date(s.submittedAt).toLocaleString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        padding: 18,
                        borderRadius: 24,
                        background: styles.sectionBg,
                        color: styles.text,
                        boxShadow: styles.insetShadow,
                        border: isUnread ? "1px solid rgba(79, 128, 243, 0.35)" : undefined,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          markNotificationReadForSubmissionId(s.id);
                          sync();
                          const stillPublished = docs.some((doc) => doc.id === d.id);
                          if (stillPublished) {
                            navigate(`${documentsMainPath}?open=${encodeURIComponent(d.id)}`);
                          } else {
                            navigate(`${incomingDocumentsPath}?openSubmission=${encodeURIComponent(s.id)}`);
                          }
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
                        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{d.title}</div>
                        <div style={{ fontSize: 12, marginTop: 6, color: styles.muted, fontWeight: 600 }}>
                          {dateLabel} · {s.contractorDisplayName || s.contractorEmailNorm}
                          {isUnread ? (
                            <span style={{ color: styles.buttonBg, marginLeft: 6 }}>· новое</span>
                          ) : null}
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            {incomingTop.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate(incomingDocumentsPath)}
                style={{
                  marginTop: 16,
                  width: "100%",
                  border: `1px solid rgba(36,59,116,0.35)`,
                  borderRadius: 999,
                  padding: "10px 16px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  background: styles.sectionBg,
                  fontFamily: "inherit",
                  color: styles.text,
                }}
              >
                Все входящие →
              </button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
});

function DocumentCardGov({
  scrollAnchorId,
  doc,
  expanded,
  onToggle,
  onRemove,
  styles,
}: {
  scrollAnchorId: string;
  doc: AssociationDocument;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  styles: ThemeStyles;
}) {
  const subs = listSubmissionsForDocument(doc.id);
  return (
    <div
      id={scrollAnchorId}
      style={{
        padding: 18,
        borderRadius: 22,
        background: styles.cardBg,
        boxShadow: styles.cardShadow,
        border: "1px solid rgba(100,116,140,0.12)",
        scrollMarginTop: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: styles.text }}>{doc.title}</div>
          <div style={{ fontSize: 13, color: styles.muted, marginTop: 6 }}>{doc.description}</div>
          <div style={{ fontSize: 12, color: styles.muted, marginTop: 8 }}>
            Создан: {new Date(doc.createdAt).toLocaleString("ru-RU")} · ответов подрядчиков: {subs.length}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onToggle}
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
            }}
          >
            {expanded ? "Свернуть" : "Подробнее"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              background: "rgba(185, 28, 28, 0.12)",
              color: "#b91c1c",
              fontFamily: "inherit",
            }}
          >
            Удалить
          </button>
        </div>
      </div>
      {expanded ? (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid rgba(100,116,140,0.15)` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: styles.muted, marginBottom: 6 }}>Шаблон для подрядчика</div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
              color: styles.text,
            }}
          >
            {doc.templateForContractor}
          </pre>
          {doc.instituteAttachment ? (
            <div style={{ marginTop: 12 }}>
              <a
                href={doc.instituteAttachment.dataUrl}
                download={doc.instituteAttachment.name}
                style={{ fontWeight: 700, color: styles.buttonBg, fontSize: 14 }}
              >
                Скачать вложение института: {doc.instituteAttachment.name}
              </a>
            </div>
          ) : null}
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 18, marginBottom: 10, color: styles.text }}>
            Ответы подрядчиков
          </div>
          {subs.length === 0 ? (
            <div style={{ fontSize: 13, color: styles.muted }}>Ответов пока нет.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {subs.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: styles.sectionBg,
                    boxShadow: styles.insetShadow,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: styles.text }}>
                    {s.contractorDisplayName} · {s.contractorEmailNorm}
                  </div>
                  <div style={{ fontSize: 12, color: styles.muted, marginTop: 4 }}>
                    {new Date(s.submittedAt).toLocaleString("ru-RU")}
                  </div>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "inherit",
                      fontSize: 13,
                      lineHeight: 1.55,
                      margin: "10px 0 0",
                      color: styles.text,
                    }}
                  >
                    {s.filledContent}
                  </pre>
                  {s.contractorAttachment ? (
                    <div style={{ marginTop: 10 }}>
                      <a
                        href={s.contractorAttachment.dataUrl}
                        download={s.contractorAttachment.name}
                        style={{ fontWeight: 700, color: styles.buttonBg, fontSize: 13 }}
                      >
                        Файл от подрядчика: {s.contractorAttachment.name}
                      </a>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default AssociationDocumentsView;
