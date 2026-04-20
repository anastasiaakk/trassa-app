import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { CabinetChromeStyles } from "./CabinetChromeLayout";
import {
  listProforientationResults,
  PROF_ORIENTATION_TAGS,
  resultMatchesEmployerTags,
  type ProforientationResult,
} from "../utils/proforientationStorage";
import {
  loadContractorTalentFilters,
  saveContractorTalentFilters,
  type ContractorTalentFilters,
} from "../utils/contractorTalentStorage";

type PanelStyles = {
  styles: CabinetChromeStyles;
  layoutStyles: Record<string, CSSProperties>;
};

/** Таблица результатов профориентации для подрядчика и РАДОР/АДО */
export const ProforientationResultsTable = memo(function ProforientationResultsTable({
  styles,
  layoutStyles,
}: PanelStyles) {
  const [rows, setRows] = useState<ProforientationResult[]>(() => listProforientationResults());

  useEffect(() => {
    const sync = () => setRows(listProforientationResults());
    window.addEventListener("trassa-proforientation-changed", sync);
    return () => window.removeEventListener("trassa-proforientation-changed", sync);
  }, []);

  return (
    <div style={layoutStyles.recentPanel}>
      <div style={layoutStyles.recentTitle}>Результаты профориентационного теста</div>
      <p style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 8 }}>
        Обучающиеся из кабинетов школьника и студента (СПО/ВО). Отображаются ведущие направления по итогам теста.
      </p>
      {rows.length === 0 ? (
        <div
          style={{
            padding: 18,
            borderRadius: 24,
            background: styles.sectionBg,
            color: styles.muted,
            fontSize: 13,
            lineHeight: 1.5,
            boxShadow: styles.insetShadow,
          }}
        >
          Пока нет сохранённых результатов. После прохождения теста в кабинетах школьника и студента данные появятся здесь.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                padding: 16,
                borderRadius: 20,
                background: styles.sectionBg,
                color: styles.text,
                boxShadow: styles.insetShadow,
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700 }}>{r.displayName}</div>
              <div style={{ fontSize: 12, color: styles.muted, marginTop: 4 }}>{r.emailNorm}</div>
              <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                {r.learnerKind === "school" ? "Школьник" : "Студент (СПО/ВО)"} · {r.primaryTag} · {r.secondaryTag}
              </div>
              <div style={{ fontSize: 12, color: styles.muted, marginTop: 8 }}>
                {new Date(r.completedAt).toLocaleString("ru-RU")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/** Подбор кадров: запрос по направлениям + совпадающие обучающиеся */
export const ContractorTalentMatcherPanel = memo(function ContractorTalentMatcherPanel({
  styles,
  layoutStyles,
  contractorEmail,
}: PanelStyles & { contractorEmail: string }) {
  const emailNorm = contractorEmail.trim().toLowerCase();
  const [filters, setFilters] = useState<ContractorTalentFilters>(() =>
    loadContractorTalentFilters(contractorEmail)
  );
  const [rows, setRows] = useState<ProforientationResult[]>(() => listProforientationResults());

  useEffect(() => {
    setFilters(loadContractorTalentFilters(contractorEmail));
  }, [contractorEmail]);

  useEffect(() => {
    const sync = () => setRows(listProforientationResults());
    window.addEventListener("trassa-proforientation-changed", sync);
    return () => window.removeEventListener("trassa-proforientation-changed", sync);
  }, []);

  const matches = useMemo(
    () =>
      rows.filter(
        (r) =>
          (r.learnerKind === "school" || r.learnerKind === "spo") &&
          resultMatchesEmployerTags(r, filters.selectedTags)
      ),
    [rows, filters.selectedTags]
  );

  const toggleTag = useCallback(
    (tag: (typeof PROF_ORIENTATION_TAGS)[number]) => {
      setFilters((prev) => {
        const set = new Set(prev.selectedTags);
        if (set.has(tag)) set.delete(tag);
        else set.add(tag);
        const next: ContractorTalentFilters = {
          ...prev,
          contractorEmailNorm: emailNorm,
          selectedTags: Array.from(set) as ContractorTalentFilters["selectedTags"],
        };
        saveContractorTalentFilters(next);
        return next;
      });
    },
    [emailNorm]
  );

  return (
    <div style={layoutStyles.recentPanel}>
      <div style={layoutStyles.recentTitle}>Потенциальные кадры</div>
      <p style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 12 }}>
        Отметьте направления, которые ищет организация. Показываются школьники и студенты, у которых ведущий или второй
        профиль совпадает с выбранными запросами.
      </p>
      {!emailNorm ? (
        <p style={{ fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>
          Укажите e-mail в настройках профиля — по нему сохраняется запрос подбора.
        </p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        {PROF_ORIENTATION_TAGS.map((tag) => (
          <label
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: styles.text,
              cursor: emailNorm ? "pointer" : "not-allowed",
              padding: "6px 10px",
              borderRadius: 12,
              background: filters.selectedTags.includes(tag) ? styles.sectionBg : styles.inputBg,
              boxShadow: filters.selectedTags.includes(tag) ? styles.insetShadow : "none",
              border: `1px solid rgba(36,59,116,0.15)`,
              opacity: emailNorm ? 1 : 0.5,
            }}
          >
            <input
              type="checkbox"
              disabled={!emailNorm}
              checked={filters.selectedTags.includes(tag)}
              onChange={() => toggleTag(tag)}
              style={{ width: 16, height: 16 }}
            />
            {tag}
          </label>
        ))}
      </div>
      <label style={{ display: "grid", gap: 6, marginBottom: 16, fontSize: 13, color: styles.muted }}>
        Комментарий к запросу
        <textarea
          value={filters.note}
          onChange={(e) => setFilters((p) => ({ ...p, note: e.target.value }))}
          onBlur={(e) => {
            saveContractorTalentFilters({
              ...filters,
              note: e.target.value,
              contractorEmailNorm: emailNorm,
            });
          }}
          rows={2}
          style={{
            borderRadius: 16,
            border: "none",
            padding: 12,
            fontFamily: "inherit",
            fontSize: 14,
            color: styles.text,
            background: styles.inputBg,
            boxShadow: styles.insetShadow,
            resize: "vertical",
          }}
        />
      </label>
      {filters.selectedTags.length === 0 ? (
        <div style={{ fontSize: 13, color: styles.muted }}>Выберите хотя бы одно направление, чтобы увидеть совпадения.</div>
      ) : matches.length === 0 ? (
        <div
          style={{
            padding: 18,
            borderRadius: 24,
            background: styles.sectionBg,
            color: styles.muted,
            fontSize: 13,
            boxShadow: styles.insetShadow,
          }}
        >
          Пока нет обучающихся с подходящим профилем по запросу.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {matches.map((r) => (
            <div
              key={r.id}
              style={{
                padding: 14,
                borderRadius: 18,
                background: styles.sectionBg,
                boxShadow: styles.insetShadow,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: styles.text }}>{r.displayName}</div>
              <div style={{ fontSize: 12, color: styles.muted }}>{r.emailNorm}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {r.learnerKind === "school" ? "Школьник" : "Студент"} · {r.primaryTag} / {r.secondaryTag}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
