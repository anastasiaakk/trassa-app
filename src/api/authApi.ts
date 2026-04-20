import type { ProfileSettingsData } from "../profileSettingsStorage";

const TOKEN_KEY = "trassa_api_access_token";

function envApiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
}

/** База URL API: в браузере с Vite — пусто (прокси /api). В Electron (file://) — localhost:4000. */
export function getApiBase(): string {
  const env = envApiBase();
  if (env) return env;
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    return "http://127.0.0.1:4000";
  }
  return "";
}

function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function applyTokenFromBody(data: unknown): void {
  const o = data as { accessToken?: string };
  if (o?.accessToken && typeof o.accessToken === "string") {
    setStoredAccessToken(o.accessToken);
  }
}

async function jsonFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const base = getApiBase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  const bearer = getStoredToken();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      return { ok: false, status: res.status, error: "Некорректный ответ сервера." };
    }
    const o = body as { ok?: boolean; error?: string; profile?: ProfileSettingsData };
    if (!res.ok) {
      if (res.status === 401) {
        setStoredAccessToken(null);
      }
      return { ok: false, status: res.status, error: o?.error ?? res.statusText };
    }
    return { ok: true, data: body as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Сеть недоступна.";
    return { ok: false, status: 0, error: msg };
  }
}

export type AuthOk = { ok: true; profile: ProfileSettingsData };
export type AuthErr = { ok: false; error: string };
export type ServerUserRecord = {
  emailNorm: string;
  createdAt: string;
  profile: ProfileSettingsData;
};

export async function authRegister(
  email: string,
  password: string,
  profile: ProfileSettingsData
): Promise<AuthOk | AuthErr> {
  const r = await jsonFetch<{ ok?: boolean; profile?: ProfileSettingsData; accessToken?: string; error?: string }>(
    `/api/auth/register`,
    {
      method: "POST",
      body: JSON.stringify({ email, password, profile }),
    }
  );
  if (!r.ok) return { ok: false, error: r.error };
  const d = r.data;
  if (!d || d.ok === false || !d.profile) {
    return { ok: false, error: d?.error ?? "Ошибка регистрации." };
  }
  applyTokenFromBody(d);
  return { ok: true, profile: d.profile };
}

export async function authLogin(email: string, password: string): Promise<AuthOk | AuthErr> {
  const r = await jsonFetch<{ ok?: boolean; profile?: ProfileSettingsData; accessToken?: string }>(
    `/api/auth/login`,
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
  if (!r.ok) return { ok: false, error: r.error };
  const d = r.data;
  if (!d?.profile) return { ok: false, error: "Неверный e-mail или пароль." };
  applyTokenFromBody(d);
  return { ok: true, profile: d.profile };
}

export async function authLogout(): Promise<{ ok: boolean }> {
  const r = await jsonFetch<{ ok: boolean }>(`/api/auth/logout`, { method: "POST" });
  setStoredAccessToken(null);
  if (!r.ok) return { ok: false };
  return { ok: true };
}

export async function authMe(): Promise<AuthOk | AuthErr> {
  const r = await jsonFetch<{ ok: boolean; profile: ProfileSettingsData }>(`/api/auth/me`, {
    method: "GET",
  });
  if (!r.ok) {
    if (r.status === 401) return { ok: false, error: "Не авторизован." };
    return { ok: false, error: r.error };
  }
  const d = r.data;
  if (!d?.profile) return { ok: false, error: "Нет профиля." };
  return { ok: true, profile: d.profile };
}

export async function authPatchProfile(profile: ProfileSettingsData): Promise<AuthOk | AuthErr> {
  const r = await jsonFetch<{ ok: boolean; profile: ProfileSettingsData; accessToken?: string }>(
    `/api/auth/profile`,
    {
      method: "PATCH",
      body: JSON.stringify(profile),
    }
  );
  if (!r.ok) return { ok: false, error: r.error };
  const d = r.data;
  if (!d?.profile) return { ok: false, error: "Не удалось сохранить." };
  applyTokenFromBody(d);
  return { ok: true, profile: d.profile };
}

export async function authListUsers(): Promise<{ ok: true; users: ServerUserRecord[] } | AuthErr> {
  const r = await jsonFetch<{ ok?: boolean; users?: ServerUserRecord[]; error?: string }>(
    `/api/auth/users`,
    { method: "GET" }
  );
  if (!r.ok) return { ok: false, error: r.error };
  const d = r.data;
  if (!Array.isArray(d?.users)) {
    return { ok: false, error: d?.error ?? "Не удалось получить список пользователей." };
  }
  return { ok: true, users: d.users };
}
