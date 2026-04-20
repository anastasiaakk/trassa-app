/**
 * Справочник организаций для входа/регистрации подрядчиков.
 */

const STORAGE_KEY = "trassa-contractor-organizations-v1";

/** Начальный набор, если список ещё не задан администратором */
const DEFAULT_ORGANIZATIONS: string[] = [
  "ООО «ДорСтрой»",
  "АО «РегионАсфальт»",
  "ЗАО «МостСтрой»",
  "ООО «ТрассКомплект»",
  "ИП Иванов П.С.",
];

export function normalizeOrgName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function parseList(raw: string): string[] {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is string => typeof x === "string").map(normalizeOrgName).filter(Boolean);
  } catch {
    return [];
  }
}

/** Уникальные названия, отсортированные по алфавиту. Пустой список — только если ключ задан явно (админ удалил всё). */
export function loadContractorOrganizations(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      saveContractorOrganizations([...DEFAULT_ORGANIZATIONS]);
      return [...DEFAULT_ORGANIZATIONS].sort((a, b) => a.localeCompare(b, "ru"));
    }
    const list = parseList(raw);
    const uniq = Array.from(new Set(list.map(normalizeOrgName))).filter(Boolean);
    return uniq.sort((a, b) => a.localeCompare(b, "ru"));
  } catch {
    return [...DEFAULT_ORGANIZATIONS].sort((a, b) => a.localeCompare(b, "ru"));
  }
}

export function saveContractorOrganizations(names: string[]): void {
  const uniq = Array.from(new Set(names.map(normalizeOrgName))).filter(Boolean);
  uniq.sort((a, b) => a.localeCompare(b, "ru"));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(uniq));
}

export function addContractorOrganization(name: string): { ok: true } | { ok: false; error: string } {
  const n = normalizeOrgName(name);
  if (!n) {
    return { ok: false, error: "Введите название организации." };
  }
  if (n.length > 200) {
    return { ok: false, error: "Слишком длинное название (макс. 200 символов)." };
  }
  const list = loadContractorOrganizations();
  if (list.some((x) => x.toLowerCase() === n.toLowerCase())) {
    return { ok: false, error: "Такая организация уже есть в списке." };
  }
  saveContractorOrganizations([...list, n]);
  return { ok: true };
}

export function removeContractorOrganization(name: string): void {
  const n = normalizeOrgName(name);
  const list = loadContractorOrganizations().filter((x) => x !== n);
  saveContractorOrganizations(list);
}

/** Фильтр для «умного поиска»: без учёта регистра, подстрока */
export function filterOrganizations(query: string, list: string[]): string[] {
  const q = normalizeOrgName(query).toLowerCase();
  if (!q) return list;
  return list.filter((org) => org.toLowerCase().includes(q));
}

export function isOrganizationInList(name: string, list: string[]): boolean {
  return resolveOrganizationFromInput(name, list) !== null;
}

/** Возвращает каноническое название из списка или null, если нет совпадения (учёт регистра). */
export function resolveOrganizationFromInput(input: string, list: string[]): string | null {
  const t = normalizeOrgName(input);
  if (!t) return null;
  const exact = list.find((x) => x === t);
  if (exact) return exact;
  return list.find((x) => x.toLowerCase() === t.toLowerCase()) ?? null;
}
