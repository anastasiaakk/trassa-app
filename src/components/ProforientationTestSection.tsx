import { memo, useCallback, useEffect, useState } from "react";
import type { CabinetChromeStyles } from "./CabinetChromeLayout";
import {
  getProforientationResultForEmail,
  PROF_ORIENTATION_QUESTIONS,
  saveProforientationResult,
  type LearnerKindProforientation,
  type ProforientationResult,
} from "../utils/proforientationStorage";
import { loadProfileSettings } from "../profileSettingsStorage";

type Props = {
  styles: CabinetChromeStyles;
  learnerKind: LearnerKindProforientation;
};

function ProforientationTestSection({ styles, learnerKind }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [result, setResult] = useState<ProforientationResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => PROF_ORIENTATION_QUESTIONS.map(() => -1));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const email = loadProfileSettings().email.trim();

  const refresh = useCallback(() => {
    const r = email ? getProforientationResultForEmail(email) : null;
    setResult(r);
  }, [email]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener("trassa-proforientation-changed", onChange);
    return () => window.removeEventListener("trassa-proforientation-changed", onChange);
  }, [refresh]);

  const startRetake = useCallback(() => {
    setPanelOpen(true);
    setEditing(true);
    setAnswers(PROF_ORIENTATION_QUESTIONS.map(() => -1));
    setStep(0);
    setError(null);
  }, []);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    setError(null);
  }, []);

  const handlePick = useCallback(
    (optionIndex: number) => {
      setError(null);
      setAnswers((prev) => {
        const next = [...prev];
        next[step] = optionIndex;
        return next;
      });
    },
    [step]
  );

  const handleNext = useCallback(() => {
    if (answers[step] < 0) {
      setError("Выберите вариант ответа.");
      return;
    }
    if (step < PROF_ORIENTATION_QUESTIONS.length - 1) {
      setStep((s) => s + 1);
      setError(null);
    }
  }, [answers, step]);

  const handleBack = useCallback(() => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (answers.some((a) => a < 0)) {
      setError("Ответьте на все вопросы.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = saveProforientationResult(learnerKind, answers);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(false);
    refresh();
  }, [answers, learnerKind, refresh]);

  const showWizard = !result || editing;
  const q = PROF_ORIENTATION_QUESTIONS[step];

  const plaqueSubtitle = !email
    ? "Укажите e-mail в профиле, чтобы сохранить результат"
    : result && !editing
      ? `Сохранённый профиль: ${result.primaryTag}`
      : "Нажмите, чтобы начать тест";

  return (
    <div
      style={{
        borderRadius: 32,
        padding: panelOpen ? 28 : 0,
        background: styles.cardBg,
        boxShadow: styles.cardShadow,
        border: `1px solid rgba(100, 116, 140, 0.15)`,
      }}
    >
      {!panelOpen ? (
        <button
          type="button"
          onClick={openPanel}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "20px 22px",
            border: "none",
            borderRadius: 30,
            background: styles.sectionBg,
            boxShadow: styles.insetShadow,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: styles.muted, marginBottom: 6 }}
            >
              ПРОФОРИЕНТАЦИЯ
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: styles.text, lineHeight: 1.25, marginBottom: 4 }}>
              Точный профориентационный тест
            </div>
            <div style={{ fontSize: 13, color: styles.muted, lineHeight: 1.4 }}>{plaqueSubtitle}</div>
          </div>
          <div
            aria-hidden
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: 14,
              background: styles.buttonBg,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            →
          </div>
        </button>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: styles.muted, marginBottom: 8 }}>
                ПРОФОРИЕНТАЦИЯ
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: styles.text }}>
                Точный профориентационный тест (дорожная отрасль)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setPanelOpen(false);
                setError(null);
                if (editing && result) {
                  setEditing(false);
                }
              }}
              style={{
                flexShrink: 0,
                border: `1px solid rgba(36,59,116,0.3)`,
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 700,
                background: "transparent",
                color: styles.muted,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Свернуть
            </button>
          </div>
          <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.55, color: styles.muted }}>
            Ответы суммируются по направлениям отрасли. Сохраняется итоговый профиль; подрядчики и ассоциации РАДОР/АДО видят
            ФИО, e-mail, тип обучающегося и ведущие направления — для профориентации и подбора практик.
          </p>

      {!email ? (
        <p style={{ margin: 0, fontSize: 14, color: "#b91c1c", fontWeight: 600 }}>
          Укажите e-mail в настройках профиля, чтобы пройти тест и сохранить результат.
        </p>
      ) : !showWizard && result ? (
        <div>
          <div
            style={{
              padding: 20,
              borderRadius: 24,
              background: styles.sectionBg,
              boxShadow: styles.insetShadow,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, color: styles.muted, marginBottom: 8 }}>Ваш профиль</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: styles.text, marginBottom: 6 }}>{result.primaryTag}</div>
            <div style={{ fontSize: 14, color: styles.muted, marginBottom: 12 }}>
              Второе направление: {result.secondaryTag}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: styles.text }}>{result.summary}</p>
            <div style={{ fontSize: 12, color: styles.muted, marginTop: 12 }}>
              {new Date(result.completedAt).toLocaleString("ru-RU")}
            </div>
          </div>
          <button
            type="button"
            onClick={startRetake}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "12px 22px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              background: styles.buttonBg,
              color: "#fff",
              fontFamily: "inherit",
            }}
          >
            Пройти тест заново
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: styles.muted, marginBottom: 12 }}>
            Вопрос {step + 1} из {PROF_ORIENTATION_QUESTIONS.length}
          </div>
          <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: styles.text, lineHeight: 1.4 }}>
            {q.text}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, idx) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handlePick(idx)}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: 18,
                  border:
                    answers[step] === idx
                      ? `2px solid ${styles.buttonBg}`
                      : `1px solid rgba(36, 59, 116, 0.2)`,
                  background: answers[step] === idx ? styles.sectionBg : styles.inputBg,
                  color: styles.text,
                  fontSize: 14,
                  lineHeight: 1.45,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: answers[step] === idx ? styles.insetShadow : "none",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {error ? (
            <p style={{ margin: "14px 0 0", fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>{error}</p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  border: `1px solid rgba(36,59,116,0.35)`,
                  borderRadius: 999,
                  padding: "12px 20px",
                  fontWeight: 700,
                  background: "transparent",
                  color: styles.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Назад
              </button>
            ) : null}
            {result && editing ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                style={{
                  border: `1px solid rgba(36,59,116,0.35)`,
                  borderRadius: 999,
                  padding: "12px 20px",
                  fontWeight: 700,
                  background: "transparent",
                  color: styles.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Отмена
              </button>
            ) : null}
            {step < PROF_ORIENTATION_QUESTIONS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "12px 22px",
                  fontWeight: 700,
                  background: styles.buttonBg,
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Далее
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "12px 22px",
                  fontWeight: 700,
                  background: styles.buttonBg,
                  color: "#fff",
                  cursor: saving ? "wait" : "pointer",
                  fontFamily: "inherit",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Сохранение…" : "Завершить и сохранить"}
              </button>
            )}
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}

export default memo(ProforientationTestSection);
