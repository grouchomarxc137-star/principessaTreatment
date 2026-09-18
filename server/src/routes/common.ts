import { Router } from "express";
import { z } from "zod";
import { MODES } from "../../../shared/types.ts";
import { prisma } from "../db.ts";
import { env } from "../env.ts";
import { HttpError, currentUser, parse } from "../http.ts";
import { pushConfigured } from "../notify.ts";
import { broadcastChange, openStream } from "../realtime.ts";
import { buildState } from "../state.ts";

// Shared by both of them.

export const commonRoutes = Router();

commonRoutes.get("/state", async (req, res) => {
  res.json(await buildState(currentUser(req)));
});

commonRoutes.get("/events", (req, res) => {
  currentUser(req);
  openStream(req, res);
});

// Distance or together: either of them can switch it.
commonRoutes.post("/mode", async (req, res) => {
  currentUser(req);
  const { mode } = parse(z.object({ mode: z.enum(MODES) }), req.body);
  await prisma.currentState.update({ where: { id: 1 }, data: { mode, modeSince: new Date() } });
  broadcastChange();
  res.json({ ok: true });
});

// --- Push subscriptions -----------------------------------------------------------

commonRoutes.get("/push/key", (req, res) => {
  currentUser(req);
  if (!pushConfigured) throw new HttpError(404, "Notifications aren't set up on the server yet.");
  res.json({ key: env.vapidPublicKey });
});

const SubscriptionBody = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

commonRoutes.post("/push/subscribe", async (req, res) => {
  const me = currentUser(req);
  const { endpoint, keys } = parse(SubscriptionBody, req.body);
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: me.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: me.id },
  });
  res.status(201).json({ ok: true });
});

commonRoutes.post("/push/unsubscribe", async (req, res) => {
  const me = currentUser(req);
  const { endpoint } = parse(z.object({ endpoint: z.string() }), req.body);
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: me.id } });
  res.json({ ok: true });
});
