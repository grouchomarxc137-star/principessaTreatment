import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./db.ts";
import { env } from "./env.ts";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

// ---------------------------------------------------------------------------
// Passwords: scrypt from Node's standard library, stored as scrypt$salt$hash.

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(expected, actual);
}

// ---------------------------------------------------------------------------
// Sessions: a random token in an httpOnly cookie; only its hash is stored.
// Long-lived and sliding, because this lives on two phones.

const COOKIE = "pt_session";
const SESSION_DAYS = 180;
const DAY = 24 * 60 * 60 * 1000;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function setCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

function readCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function startSession(res: Response, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  await prisma.session.create({ data: { id: sha256(token), userId, expiresAt } });
  setCookie(res, token, expiresAt);
}

export async function endSession(req: Request, res: Response) {
  const token = readCookie(req);
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  res.clearCookie(COOKIE, { path: "/" });
}

// Attaches req.user when the cookie belongs to a live session. Never reads a
// role from the request itself.
export async function loadSession(req: Request, res: Response, next: NextFunction) {
  const token = readCookie(req);
  if (!token) return next();

  const session = await prisma.session.findUnique({
    where: { id: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    res.clearCookie(COOKIE, { path: "/" });
    return next();
  }

  req.user = { id: session.user.id, role: session.user.role, name: session.user.name };

  // Slide the expiry forward at most once a day.
  if (Date.now() - session.lastSeenAt.getTime() > DAY) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(), expiresAt },
    });
    setCookie(res, token, expiresAt);
  }
  next();
}

// ---------------------------------------------------------------------------
// Small in-memory limiter for sign-in attempts.

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}
