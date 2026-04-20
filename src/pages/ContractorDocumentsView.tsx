import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { loadProfileSettings } from "../profileSettingsStorage";
import {
  contractorHasSubmittedDocument,
  getDocument,
  listAllDocumentsForContractors,
  submitContractorDocument,
  SHARED_DOCS_UPDATED_EVENT,
  type AssociationDocument,
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
  layoutStyles: Record<string, CSSProperties>;
  /** Тема кабинета — для неоморфной плашки «Документ отправлен» */
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

const ContractorDocumentsView = memo(function ContractorDocumentsView({
  styles,
  layoutStyles,
  isDark = false,
}: Props) {
  const [docs, setDocs] = useState(() => listAllDocumentsForContractors());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filled, setFilled] = useState("");
  const [attach, setAttach] = useState<{ name: string; dataUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [fileDrag, setFileDrag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = loadProfileSettings();
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  const contractorLabel = displayName || profile.contractorCompanyName.trim() || "Подрядчик";
  const emailNorm = profile.email.trim().toLowerCase();

  const sync = useCallback(() => setDocs(listAllDocumentsForContractors()), []);

  useEffect(() => {
    sync();
    const on = () => sync();
    window.addEventListener(SHARED_DOCS_UPDATED_EVENT, on);
    return () => window.removeEventListener(SHARED_DOCS_UPDATED_EVENT, on);
  }, [sync]);

  const activeDoc = activeId ? getDocument(activeId) : null;

  const alreadySubmitted =
    activeId && emailNorm.includes("@") ? contractorHasSubmittedDocument(activeId, emailNorm) : false;

  const onPickFile = useCallback(
    async (file: File | undefined) => {
      setError(null);
      const data = await applyFile(file, setError);
      setAttach(data);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    setError(null);
    setDoneMsg(null);
    if (!activeId || !activeDoc) {
      setError("Выберите документ.");
      return;
    }
    if (!emailNorm.includes("@")) {
      setError("Укажите e-mail в настройках профиля — так ассоциация идентифицирует ответ.");
      return;
    }
    const res = submitContractorDocument({
      documentId: activeId,
      contractorEmailNorm: emailNorm,
      contractorDisplayName: contractorLabel,
      filledContent: filled,
      contractorAttachment: attach ?? undefined,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDoneMsg("Документ отправлен.");
    setFilled("");
    setAttach(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    sync();
  }, [activeId, activeDoc, filled, attach, emailNorm, contractorLabel, sync]);

  const assocLabel = (a: AssociationDocument["association"]) => (a === "ado" ? "АДО" : "РАДОР");

  const doneNeomorphicStyle = useMemo((): CSSProperties => {
    if (isDark) {
      return {
        borderRadius: 20,
        padding: "16px 22px",
        background: styles.cardBg,
        color: styles.text,
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: "0.02em",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "6px 6px 14px rgba(0,0,0,0.45), -4px -4px 10px rgba(255,255,255,0.04), inset 1px 1px 0 rgba(255,255,255,0.06)",
      };
    }
    return {
      borderRadius: 20,
      padding: "16px 22px",
      background: styles.cardBg,
      color: styles.text,
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: "0.02em",
      border: "1px solid rgba(255,255,255,0.75)",
      boxShadow:
        "8px 8px 16px rgba(163, 177, 198, 0.55), -6px -6px 14px rgba(255, 255, 255, 0.95), inset 2px 2px 4px rgba(255,255,255,0.65)",
    };
  }, [isDark, styles.cardBg, styles.text]);

  const fieldLocked = alreadySubmitted;

  return (
    <div style={{ ...(layoutStyles.recentPanel ?? {}), maxWidth: 920 }}>
      <div style={layoutStyles.recentTitle ?? {}}>Документы ассоциаций</div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: styles.muted, margin: "0 0 18px" }}>
        Просматривайте шаблоны, заполняйте поля и отправляйте ответ. Можно прикрепить файл.
      </p>

      <div style={{ display: "grid", gap: 12, marginBottom: 22 }}>
        {docs.length === 0 ? (
          <div style={{ fontSize: 14, color: styles.muted, padding: 18, borderRadius: 18, background: styles.sectionBg, boxShadow: styles.insetShadow }}>
            Ассоциации ещё не опубликовали документы.
          </div>
        ) : (
          docs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setActiveId(d.id);
                setFilled("");
                setAttach(null);
                setError(null);
                setDoneMsg(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              style={{
                textAlign: "left",
                padding: "16px 18px",
                borderRadius: 20,
                border: activeId === d.id ? `2px solid ${styles.buttonBg}` : "1px solid rgba(36,59,116,0.18)",
                background: activeId === d.id ? styles.sectionBg : styles.cardBg,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: activeId === d.id ? styles.insetShadow : styles.cardShadow,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: styles.muted, letterSpacing: "0.06em" }}>
                Ассоциация «{assocLabel(d.association)}»
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: styles.text, marginTop: 4 }}>{d.title}</div>
              <div style={{ fontSize: 13, color: styles.muted, marginTop: 6 }}>{d.description}</div>
            </button>
          ))
        )}
      </div>

      {activeDoc ? (
        <div
          style={{
            padding: 20,
            borderRadius: 24,
            background: styles.sectionBg,
            boxShadow: styles.insetShadow,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, color: styles.text }}>Шаблон</div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: 14,
              lineHeight: 1.65,
              margin: "0 0 16px",
              color: styles.text,
            }}
          >
            {activeDoc.templateForContractor}
          </pre>
          {activeDoc.instituteAttachment ? (
            <div style={{ marginBottom: 16 }}>
              <a
                href={activeDoc.instituteAttachment.dataUrl}
                download={activeDoc.instituteAttachment.name}
                style={{ fontWeight: 700, color: styles.buttonBg, fontSize: 14 }}
              >
                Скачать материал института: {activeDoc.instituteAttachment.name}
              </a>
            </div>
          ) : null}

          {alreadySubmitted && !doneMsg ? (
            <div
              role="status"
              style={{
                marginBottom: 16,
                padding: "14px 16px",
                borderRadius: 16,
                background: isDark ? "rgba(251, 191, 36, 0.12)" : "rgba(251, 191, 36, 0.18)",
                border: `1px solid ${isDark ? "rgba(251, 191, 36, 0.35)" : "rgba(217, 119, 6, 0.35)"}`,
                color: styles.text,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Вы уже отправляли заполненный документ по этому письму. Повторная отправка не требуется.
            </div>
          ) : null}

          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 6 }}>
            Заполненная форма / комментарий для отправки
          </label>
          <textarea
            value={filled}
            onChange={(e) => setFilled(e.target.value)}
            rows={8}
            disabled={fieldLocked}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(36,59,116,0.2)",
              fontFamily: "inherit",
              fontSize: 14,
              resize: "vertical",
              background: styles.cardBg,
              color: styles.text,
              marginBottom: 12,
              opacity: fieldLocked ? 0.65 : 1,
            }}
          />

          <div style={{ fontSize: 12, fontWeight: 700, color: styles.muted, marginBottom: 8 }}>Прикрепить файл (опционально)</div>
          <input
            ref={fileInputRef}
            type="file"
            tabIndex={-1}
            disabled={fieldLocked}
            onChange={async (e) => {
              await onPickFile(e.target.files?.[0]);
            }}
            style={{ display: "none" }}
          />
          <div
            role="button"
            tabIndex={fieldLocked ? -1 : 0}
            aria-disabled={fieldLocked}
            onKeyDown={(e) => {
              if (fieldLocked) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onClick={() => {
              if (!fieldLocked) fileInputRef.current?.click();
            }}
            onDragOver={(e) => {
              if (fieldLocked) return;
              e.preventDefault();
              e.stopPropagation();
              setFileDrag(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setFileDrag(false);
            }}
            onDrop={async (e) => {
              if (fieldLocked) return;
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
              cursor: fieldLocked ? "not-allowed" : "pointer",
              transition: "border-color 0.15s, background 0.15s",
              marginBottom: attach ? 12 : 14,
              opacity: fieldLocked ? 0.65 : 1,
              pointerEvents: fieldLocked ? "none" : "auto",
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

          {attach ? (
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
                {attach.name}
              </div>
              <button
                type="button"
                disabled={fieldLocked}
                onClick={(e) => {
                  e.stopPropagation();
                  setAttach(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: fieldLocked ? "not-allowed" : "pointer",
                  background: "rgba(185, 28, 28, 0.12)",
                  color: "#b91c1c",
                  fontFamily: "inherit",
                  opacity: fieldLocked ? 0.5 : 1,
                }}
              >
                Убрать
              </button>
            </div>
          ) : null}

          {error ? <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 10 }}>{error}</div> : null}
          {doneMsg ? (
            <div style={{ ...doneNeomorphicStyle, marginBottom: 14 }} role="status">
              {doneMsg}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={fieldLocked}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "12px 24px",
              fontWeight: 700,
              cursor: fieldLocked ? "not-allowed" : "pointer",
              background: styles.buttonBg,
              color: styles.buttonText,
              fontFamily: "inherit",
              opacity: fieldLocked ? 0.55 : 1,
            }}
          >
            Отправить ассоциации
          </button>
        </div>
      ) : null}
    </div>
  );
});

export default ContractorDocumentsView;
