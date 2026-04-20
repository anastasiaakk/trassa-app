import type { CookieOptions, NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const COOKIE = "trassa_access";

export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters (see server/.env.example).");
  }
  return s;
}

export type JwtPayload = {
  sub: string;
  emailNorm: string;
};

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
  if (!decoded?.sub || !decoded?.emailNorm) {
    throw new Error("Invalid token payload");
  }
  return decoded;
}

export function cookieOptions(): CookieOptions {
  const prod = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: prod,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE, token, cookieOptions());
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

export function readTokenFromRequest(req: Request): string | null {
  const c = req.cookies?.[COOKIE];
  if (typeof c === "string" && c.length > 0) return c;
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const t = readTokenFromRequest(req);
    if (!t) {
      res.status(401).json({ ok: false, error: "Требуется вход." });
      return;
    }
    const payload = verifyAccessToken(t);
    (req as Request & { auth?: JwtPayload }).auth = payload;
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Сессия недействительна. Войдите снова." });
  }
}
