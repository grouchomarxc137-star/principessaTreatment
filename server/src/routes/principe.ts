import { Router } from "express";
import { z } from "zod";
import { MISSIONS_TO_REMEMBER, OFFER_HOURS, missionsFor } from "../catalog.ts";
import { prisma } from "../db.ts";
import { HttpError, parse, requireRole } from "../http.ts";
import { notifyLater } from "../notify.ts";
import { broadcastChange } from "../realtime.ts";

// His side: putting care on offer, and secret missions she only learns about
// once he's done them.

export const principeRoutes = Router();

principeRoutes.use((req, _res, next) => {
  requireRole(req, "PRINCIPE");
  next();
});

// --- Open offers ------------------------------------------------------------------

principeRoutes.post("/offers", async (req, res) => {
  const { text } = parse(z.object({ text: z.string().trim().min(1).max(80) }), req.body);
  await prisma.openOffer.create({
    data: { text, expiresAt: new Date(Date.now() + OFFER_HOURS * 60 * 60 * 1000) },
  });
  broadcastChange();
  res.status(201).json({ ok: true });
});

principeRoutes.post("/offers/:id/withdraw", async (req, res) => {
  const offer = await prisma.openOffer.findUnique({ where: { id: req.params.id } });
  if (!offer) throw new HttpError(404, "That offer no longer exists.");
  if (offer.status === "OPEN") {
    await prisma.openOffer.update({ where: { id: offer.id }, data: { status: "WITHDRAWN", closedAt: new Date() } });
    broadcastChange();
  }
  res.json({ ok: true });
});

// --- Mystery care -------------------------------------------------------------------

// Draws a new mission for the current mode, avoiding recent ones. Any mission
// he was still holding is set aside.
principeRoutes.post("/mystery/draw", async (_req, res) => {
  const current = await prisma.currentState.findUniqueOrThrow({ where: { id: 1 } });
  const recent = await prisma.mysteryMission.findMany({
    orderBy: { createdAt: "desc" },
    take: MISSIONS_TO_REMEMBER,
    select: { text: true },
  });
  const seen = new Set(recent.map((m) => m.text));
  const options = missionsFor(current.mode);
  const fresh = options.filter((m) => !seen.has(m.text));
  const pool = fresh.length ? fresh : options;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  await prisma.mysteryMission.updateMany({
    where: { status: "ACTIVE" },
    data: { status: "SKIPPED", closedAt: new Date() },
  });
  const mission = await prisma.mysteryMission.create({ data: { text: pick.text, mode: current.mode } });
  res.status(201).json({ id: mission.id, text: mission.text, createdAt: mission.createdAt.toISOString() });
});

// Done: the secret comes out. A finished MYSTERY request reveals the mission
// to her and gets the same "did it help?" as anything she asked for.
principeRoutes.post("/mystery/:id/done", async (req, res) => {
  const mission = await prisma.mysteryMission.findUnique({ where: { id: req.params.id } });
  if (!mission) throw new HttpError(404, "That mission no longer exists.");
  if (mission.status !== "ACTIVE") return res.json({ ok: true });

  const current = await prisma.currentState.findUniqueOrThrow({ where: { id: 1 } });
  const now = new Date();
  await prisma.$transaction([
    prisma.mysteryMission.update({ where: { id: mission.id }, data: { status: "DONE", closedAt: now } }),
    prisma.careRequest.create({
      data: {
        kind: "MYSTERY",
        status: "DONE",
        closedAt: now,
        missionId: mission.id,
        feeling: current.feeling,
        mode: current.mode,
      },
    }),
  ]);
  broadcastChange();
  notifyLater("PRINCIPESSA", {
    title: "That was a secret mission",
    body: "Principe was on a mystery mission for you. Open the app to see what it was.",
    tag: `mystery-${mission.id}`,
  });
  res.json({ ok: true });
});

principeRoutes.post("/mystery/:id/skip", async (req, res) => {
  await prisma.mysteryMission.update({
    where: { id: req.params.id },
    data: { status: "SKIPPED", closedAt: new Date() },
  });
  res.json({ ok: true });
});
