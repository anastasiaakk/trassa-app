import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db.js";
import type { ProfileSettingsData } from "../profileTypes.js";
import { defaultProfile } from "../profileTypes.js";
import { validatePasswordPolicy } from "../passwordPolicy.js";
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signAccessToken,
  type JwtPayload,
} from "../middleware/auth.js";

const profileSchema = z.object({
  firstName: z.string().max(200).optional(),
  lastName: z.string().max(200).optional(),
  roleLabel: z.string().max(200).optional(),
  messengerUid: z.string().max(200).optional(),
  contractorCompanyName: z.string().max(500).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(80).optional(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
});

const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(500),
  /** Поля профиля с клиента; e-mail в профиле должен совпадать с `email`. */
  profile: z.record(z.unknown()).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(500),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseProfile(json: string): ProfileSettingsData {
  const o = JSON.parse(json) as ProfileSettingsData;
  return defaultProfile(o);
}

export const authRouter = Router();

authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }
  const emailNorm = normalizeEmail(parsed.data.email);
  const pwErr = validatePasswordPolicy(parsed.data.password);
  if (pwErr) {
    res.status(400).json({ ok: false, error: pwErr });
    return;
  }

  const exists = db.prepare("SELECT 1 FROM users WHERE email_norm = ?").get(emailNorm);
  if (exists) {
    res.status(409).json({ ok: false, error: "Этот e-mail уже зарегистрирован." });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const id = randomUUID();
  const rawProfile = (parsed.data.profile ?? {}) as Partial<ProfileSettingsData>;
  const profile = defaultProfile({
    ...rawProfile,
    email: parsed.data.email.trim(),
  });

  db.prepare(
    `INSERT INTO users (id, email_norm, password_hash, profile_json, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, emailNorm, passwordHash, JSON.stringify(profile), new Date().toISOString());

  const payload: JwtPayload = { sub: id, emailNorm };
  const token = signAccessToken(payload);
  setAuthCookie(res, token);
  /** Дублируем в JSON для Electron / file://, где cookie к API часто не цепляются */
  res.status(201).json({ ok: true, profile, accessToken: token });
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }
  const emailNorm = normalizeEmail(parsed.data.email);
  const row = db
    .prepare("SELECT id, password_hash, profile_json FROM users WHERE email_norm = ?")
    .get(emailNorm) as { id: string; password_hash: string; profile_json: string } | undefined;

  if (!row) {
    res.status(401).json({ ok: false, error: "Неверный e-mail или пароль." });
    return;
  }

  const ok = await bcrypt.compare(parsed.data.password, row.password_hash);
  if (!ok) {
    res.status(401).json({ ok: false, error: "Неверный e-mail или пароль." });
    return;
  }

  const profile = parseProfile(row.profile_json);
  const payload: JwtPayload = { sub: row.id, emailNorm };
  const token = signAccessToken(payload);
  setAuthCookie(res, token);
  res.json({ ok: true, profile, accessToken: token });
});

authRouter.post("/logout", (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  const auth = (req as Request & { auth: JwtPayload }).auth;
  const row = db.prepare("SELECT profile_json FROM users WHERE id = ?").get(auth.sub) as
    | { profile_json: string }
    | undefined;
  if (!row) {
    clearAuthCookie(res);
    res.status(401).json({ ok: false, error: "Пользователь не найден." });
    return;
  }
  const profile = parseProfile(row.profile_json);
  res.json({ ok: true, profile });
});

authRouter.patch("/profile", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as Request & { auth: JwtPayload }).auth;
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }

  const row = db.prepare("SELECT profile_json FROM users WHERE id = ?").get(auth.sub) as
    | { profile_json: string }
    | undefined;
  if (!row) {
    res.status(404).json({ ok: false, error: "Пользователь не найден." });
    return;
  }

  const current = parseProfile(row.profile_json);
  const next: ProfileSettingsData = {
    ...current,
    ...parsed.data,
    email: parsed.data.email?.trim() ?? current.email,
  };

  let newEmailNorm = auth.emailNorm;
  if (parsed.data.email) {
    newEmailNorm = normalizeEmail(parsed.data.email);
    if (newEmailNorm !== auth.emailNorm) {
      const taken = db.prepare("SELECT 1 FROM users WHERE email_norm = ? AND id != ?").get(newEmailNorm, auth.sub);
      if (taken) {
        res.status(409).json({ ok: false, error: "Этот e-mail уже занят." });
        return;
      }
      db.prepare("UPDATE users SET email_norm = ? WHERE id = ?").run(newEmailNorm, auth.sub);
    }
  }

  db.prepare("UPDATE users SET profile_json = ? WHERE id = ?").run(JSON.stringify(next), auth.sub);

  let newAccessToken: string | undefined;
  if (newEmailNorm !== auth.emailNorm) {
    newAccessToken = signAccessToken({ sub: auth.sub, emailNorm: newEmailNorm });
    setAuthCookie(res, newAccessToken);
  }

  res.json({
    ok: true,
    profile: next,
    ...(newAccessToken ? { accessToken: newAccessToken } : {}),
  });
});
