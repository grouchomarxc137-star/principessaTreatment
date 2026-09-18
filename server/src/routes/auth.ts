import { Router } from "express";
import { z } from "zod";
import { clearAttempts, endSession, startSession, tooManyAttempts, verifyPassword } from "../auth.ts";
import { prisma } from "../db.ts";
import { HttpError, currentUser, parse } from "../http.ts";

export const authRoutes = Router();

// "Who are you" picks the account; the password proves it. The role the app
// works with afterwards always comes from the session, never from a request.
const LoginBody = z.object({
  who: z.enum(["PRINCIPESSA", "PRINCIPE"]),
  password: z.string().min(1).max(200),
});

authRoutes.post("/login", async (req, res) => {
  const { who, password } = parse(LoginBody, req.body);
  const limitKey = `${req.ip}:${who}`;
  if (tooManyAttempts(limitKey)) throw new HttpError(429, "Too many tries. Wait 15 minutes and try again.");

  const user = await prisma.user.findUnique({ where: { role: who } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "That password doesn't match.");
  }
  clearAttempts(limitKey);
  await startSession(res, user.id);
  res.json({ id: user.id, role: user.role, name: user.name });
});

authRoutes.post("/logout", async (req, res) => {
  await endSession(req, res);
  res.json({ ok: true });
});

authRoutes.get("/me", (req, res) => {
  res.json(currentUser(req));
});
