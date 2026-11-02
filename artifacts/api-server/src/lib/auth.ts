import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, accounts, sessions } from "@workspace/db";

const scrypt = promisify(scryptCallback);
const COOKIE = "habit_circle_session";
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
export type Account = typeof accounts.$inferSelect;
declare global {
  namespace Express {
    interface Request { account?: Account }
  }
}

export function publicUser(account: Account) {
  return { id: account.id, displayName: account.displayName, email: account.email };
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  const key = await scrypt(password, salt, 64) as Buffer;
  const saved = Buffer.from(expected, "hex");
  return saved.length === key.length && timingSafeEqual(saved, key);
}
function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function cookieOptions(req: Request) {
  return { httpOnly: true, secure: req.secure, sameSite: "lax" as const, path: "/" };
}
export async function endSession(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE];
  if (typeof token === "string") {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
  }
  res.clearCookie(COOKIE, cookieOptions(req));
}
export async function startSession(req: Request, res: Response, userId: number) {
  await endSession(req, res);
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    tokenHash: tokenHash(token), userId, expiresAt: new Date(Date.now() + MAX_AGE),
  });
  res.cookie(COOKIE, token, { ...cookieOptions(req), maxAge: MAX_AGE });
}
export async function requireAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[COOKIE];
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    res.status(401).json({ error: "Please sign in to continue." }); return;
  }
  const [row] = await db.select({ account: accounts }).from(sessions)
    .innerJoin(accounts, eq(accounts.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date())));
  if (!row) { res.status(401).json({ error: "Please sign in to continue." }); return; }
  req.account = row.account;
  next();
}

// Bound memory use and slow repeated password guesses without storing credentials.
const attempts = new Map<string, { count: number; until: number }>();
export function limitAuth(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const key = req.ip || "unknown";
  const value = attempts.get(key) || { count: 0, until: now + 15 * 60_000 };
  if (value.count >= 30) {
    res.setHeader("Retry-After", Math.ceil((value.until - now) / 1000));
    res.status(429).json({ error: "Too many attempts. Please try again in 15 minutes." }); return;
  }
  value.count++;
  attempts.set(key, value);
  next();
}
