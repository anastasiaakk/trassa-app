/**
 * Запросы подрядчика по направлениям для подбора школьников и студентов.
 */

import { PROF_ORIENTATION_TAGS, type ProfOrientationTag } from "./proforientationStorage";

const KEY = "trassa-contractor-talent-filters-v1";

export type ContractorTalentFilters = {
  /** Нормализованный e-mail учётной записи подрядчика */
  contractorEmailNorm: string;
  /** Выбранные направления (из профориентационного теста) */
  selectedTags: ProfOrientationTag[];
  /** Примечание к запросу (опционально) */
  note: string;
};

type File = { entries: ContractorTalentFilters[] };

function read(): File {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { entries: [] };
    const data = JSON.parse(raw) as File;
    if (!data || !Array.isArray(data.entries)) return { entries: [] };
    return data;
  } catch {
    return { entries: [] };
  }
}

function write(file: File) {
  localStorage.setItem(KEY, JSON.stringify(file));
  window.dispatchEvent(new CustomEvent("trassa-contractor-talent-changed"));
}

export function loadContractorTalentFilters(contractorEmail: string): ContractorTalentFilters {
  const contractorEmailNorm = contractorEmail.trim().toLowerCase();
  const row = read().entries.find((e) => e.contractorEmailNorm === contractorEmailNorm);
  if (row) {
    return {
      ...row,
      selectedTags: row.selectedTags.filter((t) =>
        (PROF_ORIENTATION_TAGS as readonly string[]).includes(t)
      ) as ProfOrientationTag[],
    };
  }
  return {
    contractorEmailNorm,
    selectedTags: [],
    note: "",
  };
}

export function saveContractorTalentFilters(filters: ContractorTalentFilters): void {
  const file = read();
  const rest = file.entries.filter((e) => e.contractorEmailNorm !== filters.contractorEmailNorm);
  rest.push({
    ...filters,
    contractorEmailNorm: filters.contractorEmailNorm.trim().toLowerCase(),
  });
  write({ entries: rest });
}
