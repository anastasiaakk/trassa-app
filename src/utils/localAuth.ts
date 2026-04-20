/**
 * Локальная «учётка» без сервера: регистрация, вход, смена пароля.
 * Пароль хранится как SHA-256 от строки пароля + соль.
 */

import {
  loadProfileSettings,
  saveProfileSettings,
  type ProfileSettingsData,
} from "../profileSettingsStorage";
import { deleteProforientationResultsForEmail } from "./proforientationStorage";
import { validatePasswordPolicy } from "./passwordPolicy";

const USERS_KEY = "trassa-local-users-v1";
const SALT = "trassa-local-auth-salt-v1";

export type LocalUserRecord = {
  emailNorm: string;
  passwordHash: string;
  profile: ProfileSettingsData;
  createdAt: string;
};

type UsersFile = {
  users: LocalUserRecord[];
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  const payload = `${password}\0${SALT}`;
  const bytes = new TextEncoder().encode(payload);
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a:${(h >>> 0).toString(16)}`;
}

function readUsersFile(): UsersFile {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return { users: [] };
    const data = JSON.parse(raw) as UsersFile;
    if (!data || !Array.isArray(data.users)) return { users: [] };
    return data;
  } catch {
    return { users: [] };
  }
}

function writeUsersFile(file: UsersFile) {
  localStorage.setItem(USERS_KEY, JSON.stringify(file));
}

/** Пока никто не зарегистрирован — допускается прежний «демо-вход» с любым логином/паролем. */
export function isLegacyLoginAllowed(): boolean {
  return readUsersFile().users.length === 0;
}

export function isEmailRegistered(email: string): boolean {
  const n = normalizeEmail(email);
  return readUsersFile().users.some((u) => u.emailNorm === n);
}

export async function registerUser(
  profile: ProfileSettingsData,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const emailNorm = normalizeEmail(profile.email);
  if (!emailNorm || !profile.email.includes("@")) {
    return { ok: false, error: "Укажите корректный e-mail." };
  }
  const pwErr = validatePasswordPolicy(password);
  if (pwErr) {
    return { ok: false, error: pwErr };
  }
  const file = readUsersFile();
  if (file.users.some((u) => u.emailNorm === emailNorm)) {
    return { ok: false, error: "Этот e-mail уже зарегистрирован." };
  }
  const passwordHash = await hashPassword(password);
  const record: LocalUserRecord = {
    emailNorm,
    passwordHash,
    profile: { ...profile, email: profile.email.trim() },
    createdAt: new Date().toISOString(),
  };
  file.users.push(record);
  writeUsersFile(file);
  saveProfileSettings(record.profile);
  return { ok: true };
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<{ ok: true; profile: ProfileSettingsData } | { ok: false }> {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm || !password) return { ok: false };
  const file = readUsersFile();
  const user = file.users.find((u) => u.emailNorm === emailNorm);
  if (!user) return { ok: false };
  const h = await hashPassword(password);
  if (h !== user.passwordHash) return { ok: false };
  saveProfileSettings(user.profile);
  return { ok: true, profile: user.profile };
}

/** Обновить профиль в записи пользователя (после правок в кабинете). */
export function syncCurrentUserProfile(profile: ProfileSettingsData): void {
  const emailNorm = normalizeEmail(profile.email);
  if (!emailNorm) return;
  const file = readUsersFile();
  const i = file.users.findIndex((u) => u.emailNorm === emailNorm);
  if (i === -1) return;
  file.users[i] = { ...file.users[i], profile: { ...profile } };
  writeUsersFile(file);
}

/** Список зарегистрированных пользователей (для админ-панели). */
export function listRegisteredUsers(): LocalUserRecord[] {
  return readUsersFile().users.map((u) => ({
    ...u,
    profile: { ...u.profile },
  }));
}

/** Админ: перезаписать профиль пользователя по e-mail. */
export function adminOverrideUserProfile(email: string, profile: ProfileSettingsData): boolean {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) return false;
  const file = readUsersFile();
  const i = file.users.findIndex((u) => u.emailNorm === emailNorm);
  if (i === -1) return false;
  file.users[i] = {
    ...file.users[i],
    profile: { ...profile, email: profile.email.trim() || file.users[i].profile.email },
  };
  writeUsersFile(file);
  try {
    const current = loadProfileSettings();
    if (normalizeEmail(current.email) === emailNorm) {
      saveProfileSettings(file.users[i].profile);
    }
  } catch {
    /* ignore */
  }
  return true;
}

/** Админ: удалить учётную запись портала по e-mail. Не затрагивает учётки администратора (/services). */
export function deleteRegisteredUser(
  email: string
): { ok: true } | { ok: false; error: string } {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) {
    return { ok: false, error: "Некорректный e-mail." };
  }
  const file = readUsersFile();
  const i = file.users.findIndex((u) => u.emailNorm === emailNorm);
  if (i === -1) {
    return { ok: false, error: "Пользователь не найден." };
  }
  file.users.splice(i, 1);
  writeUsersFile(file);
  deleteProforientationResultsForEmail(emailNorm);
  try {
    const current = loadProfileSettings();
    if (normalizeEmail(current.email) === emailNorm) {
      saveProfileSettings({
        firstName: "",
        lastName: "",
        roleLabel: "Организатор",
        messengerUid: "",
        contractorCompanyName: "",
        email: "",
        phone: "",
        notifyEmail: true,
        notifyPush: false,
      });
    }
  } catch {
    /* ignore */
  }
  return { ok: true };
}

export async function resetPasswordForEmail(
  email: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) {
    return { ok: false, error: "Укажите e-mail." };
  }
  const pwErr = validatePasswordPolicy(newPassword);
  if (pwErr) {
    return { ok: false, error: pwErr };
  }
  const file = readUsersFile();
  const i = file.users.findIndex((u) => u.emailNorm === emailNorm);
  if (i === -1) {
    return { ok: false, error: "Аккаунт с таким e-mail не найден." };
  }
  const passwordHash = await hashPassword(newPassword);
  file.users[i] = {
    ...file.users[i],
    passwordHash,
    profile: { ...file.users[i].profile, email: file.users[i].profile.email || email },
  };
  writeUsersFile(file);
  try {
    const current = loadProfileSettings();
    if (normalizeEmail(current.email) === emailNorm) {
      saveProfileSettings(file.users[i].profile);
    }
  } catch {
    /* ignore */
  }
  return { ok: true };
}
