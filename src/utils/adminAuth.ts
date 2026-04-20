/**
 * Локальная авторизация администратора (отдельно от кабинетов ролей).
 * Сессия в sessionStorage — закрытие вкладки = выход.
 * Встроенные учётки: Ксения и Анастасия (добавляются при первом запуске / миграции).
 */

import { hashPassword } from "./localAuth";
import { validatePasswordPolicy } from "./passwordPolicy";

const ADMIN_USERS_KEY = "trassa-admin-users-v1";
const SESSION_KEY = "trassa-admin-session-v1";

export type AdminCabinetId = "ksenia" | "anastasia";

export type BuiltinAdminAccount = {
  email: string;
  password: string;
  displayName: string;
  cabinetId: AdminCabinetId;
};

/** Учётки по умолчанию (латиница + цифры, ≥8). Смените пароли после входа. */
export const BUILTIN_ADMIN_ACCOUNTS: BuiltinAdminAccount[] = [
  {
    email: "ksenia@trassa.local",
    password: "KseniaAdm8",
    displayName: "Ксения",
    cabinetId: "ksenia",
  },
  {
    email: "anastasia@trassa.local",
    password: "NastiaAdm8",
    displayName: "Анастасия",
    cabinetId: "anastasia",
  },
];

/** Старая учётка admin@… из ранних версий — узнаём по email в хранилище */
const LEGACY_ADMIN_EMAIL = "admin@trassa.local";

type AdminUserRecord = {
  emailNorm: string;
  passwordHash: string;
};

type AdminUsersFile = {
  version: 1;
  users: AdminUserRecord[];
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readFile(): AdminUsersFile {
  try {
    const raw = localStorage.getItem(ADMIN_USERS_KEY);
    if (!raw) return { version: 1, users: [] };
    const parsed = JSON.parse(raw) as AdminUsersFile;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.users)) {
      return { version: 1, users: [] };
    }
    return parsed;
  } catch {
    return { version: 1, users: [] };
  }
}

function writeFile(file: AdminUsersFile): void {
  localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(file));
}

/**
 * Добавляет встроенных администраторов и при необходимости учётку из старых версий.
 */
export async function ensureBuiltinAdminUsers(): Promise<void> {
  const file = readFile();
  const existing = new Set(file.users.map((u) => u.emailNorm));
  let changed = false;

  for (const acc of BUILTIN_ADMIN_ACCOUNTS) {
    const norm = normalizeEmail(acc.email);
    if (!existing.has(norm)) {
      file.users.push({
        emailNorm: norm,
        passwordHash: await hashPassword(acc.password),
      });
      existing.add(norm);
      changed = true;
    }
  }

  if (changed) writeFile(file);
}

/** @deprecated используйте ensureBuiltinAdminUsers */
export async function ensureDefaultAdminUser(): Promise<void> {
  await ensureBuiltinAdminUsers();
}

export function getBuiltinAdminHints(): { email: string; password: string; name: string }[] {
  return BUILTIN_ADMIN_ACCOUNTS.map((a) => ({
    email: a.email,
    password: a.password,
    name: a.displayName,
  }));
}

/** Подсказка для формы входа (первая учётка) */
export function getDefaultAdminCredentials(): { email: string; password: string } {
  const first = BUILTIN_ADMIN_ACCOUNTS[0];
  return { email: first.email, password: first.password };
}

export function getAdminCabinetInfo(emailNorm: string | null): {
  cabinetId: AdminCabinetId;
  displayName: string;
} {
  if (!emailNorm) {
    return { cabinetId: "ksenia", displayName: "Администратор" };
  }
  for (const acc of BUILTIN_ADMIN_ACCOUNTS) {
    if (normalizeEmail(acc.email) === emailNorm) {
      return { cabinetId: acc.cabinetId, displayName: acc.displayName };
    }
  }
  if (emailNorm === normalizeEmail(LEGACY_ADMIN_EMAIL)) {
    return { cabinetId: "ksenia", displayName: "Администратор" };
  }
  return { cabinetId: "ksenia", displayName: emailNorm };
}

export async function loginAdmin(email: string, password: string): Promise<boolean> {
  await ensureBuiltinAdminUsers();
  const emailNorm = normalizeEmail(email);
  if (!emailNorm || !password) return false;
  const file = readFile();
  const user = file.users.find((u) => u.emailNorm === emailNorm);
  if (!user) return false;
  const h = await hashPassword(password);
  if (h !== user.passwordHash) return false;
  sessionStorage.setItem(SESSION_KEY, emailNorm);
  return true;
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getAdminSessionEmail(): string | null {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function isAdminLoggedIn(): boolean {
  return getAdminSessionEmail() !== null;
}

export async function updateAdminPassword(
  oldPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = getAdminSessionEmail();
  if (!session) {
    return { ok: false, error: "Сессия администратора не найдена." };
  }
  const pwErr = validatePasswordPolicy(newPassword);
  if (pwErr) {
    return { ok: false, error: pwErr };
  }
  const file = readFile();
  const user = file.users.find((u) => u.emailNorm === session);
  if (!user) {
    return { ok: false, error: "Учётная запись не найдена." };
  }
  if ((await hashPassword(oldPassword)) !== user.passwordHash) {
    return { ok: false, error: "Неверный текущий пароль." };
  }
  user.passwordHash = await hashPassword(newPassword);
  writeFile(file);
  return { ok: true };
}
