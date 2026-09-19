import { Router } from "express";
import { z } from "zod";
import { CARD_MODES, FEELINGS } from "../../../shared/types.ts";
import { prisma } from "../db.ts";
import { HttpError, parse, requireRole } from "../http.ts";
import { notifyLater } from "../notify.ts";
import { broadcastChange } from "../realtime.ts";
import { requestInclude, toCardView, toRequestView } from "../state.ts";

// Things only she can change: how she's feeling, how she wants to be treated,
// her deck, her secret wishes, and what she's learned helps.

export const principessaRoutes = Router();

principessaRoutes.use((req, _res, next) => {
  requireRole(req, "PRINCIPESSA");
  next();
});

// --- How she's feeling --------------------------------------------------------

const FeelingBody = z.object({ feeling: z.enum(FEELINGS).nullable() });

principessaRoutes.post("/feeling", async (req, res) => {
  const { feeling } = parse(FeelingBody, req.body);
  await prisma.currentState.update({
    where: { id: 1 },
    data: { feeling, feelingSince: feeling ? new Date() : null },
  });
  broadcastChange();
  res.json({ ok: true });
});

// --- Do / Don't -----------------------------------------------------------------

principessaRoutes.post("/preferences/:id/toggle", async (req, res) => {
  const { on } = parse(z.object({ on: z.boolean() }), req.body);
  await prisma.preference.update({ where: { id: req.params.id }, data: { activeSince: on ? new Date() : null } });
  broadcastChange();
  res.json({ ok: true });
});

const PreferenceBody = z.object({
  kind: z.enum(["DO", "DONT"]),
  text: z.string().trim().min(1).max(60),
});

// A new item of her own is switched on straight away.
principessaRoutes.post("/preferences", async (req, res) => {
  const { kind, text } = parse(PreferenceBody, req.body);
  const last = await prisma.preference.findFirst({ where: { kind }, orderBy: { sortOrder: "desc" } });
  await prisma.preference.create({
    data: { kind, text, isCustom: true, activeSince: new Date(), sortOrder: (last?.sortOrder ?? 0) + 10 },
  });
  broadcastChange();
  res.status(201).json({ ok: true });
});

principessaRoutes.post("/preferences/clear", async (_req, res) => {
  await prisma.preference.updateMany({ data: { activeSince: null } });
  broadcastChange();
  res.json({ ok: true });
});

principessaRoutes.delete("/preferences/:id", async (req, res) => {
  const pref = await prisma.preference.findUnique({ where: { id: req.params.id } });
  if (!pref?.isCustom) throw new HttpError(400, "Only items you added can be removed. Switch this one off instead.");
  await prisma.preference.delete({ where: { id: pref.id } });
  broadcastChange();
  res.json({ ok: true });
});

// --- Her deck -------------------------------------------------------------------

principessaRoutes.get("/cards", async (_req, res) => {
  const cards = await prisma.careCard.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  res.json(cards.map(toCardView));
});

const CardBody = z.object({
  title: z.string().trim().min(1).max(60),
  // Only older "I can't ask for it" requests read this; new cards reuse the title.
  forHim: z.string().trim().min(1).max(80).optional(),
  mode: z.enum(CARD_MODES),
});

principessaRoutes.post("/cards", async (req, res) => {
  const data = parse(CardBody, req.body);
  const last = await prisma.careCard.findFirst({ orderBy: { sortOrder: "desc" } });
  const card = await prisma.careCard.create({
    data: { ...data, forHim: data.forHim ?? data.title, isCustom: true, sortOrder: (last?.sortOrder ?? 0) + 10 },
  });
  broadcastChange();
  res.status(201).json(toCardView(card));
});

principessaRoutes.patch("/cards/:id", async (req, res) => {
  const data = parse(CardBody.partial().extend({ hidden: z.boolean().optional() }), req.body);
  const card = await prisma.careCard.update({ where: { id: req.params.id }, data });
  broadcastChange();
  res.json(toCardView(card));
});

// --- Secret wishes -------------------------------------------------------------------

principessaRoutes.get("/wishes", async (_req, res) => {
  const wishes = await prisma.wish.findMany({ orderBy: { createdAt: "desc" } });
  res.json(wishes.map((w) => ({ id: w.id, text: w.text, mode: w.mode })));
});

const WishBody = z.object({ text: z.string().trim().min(1).max(120), mode: z.enum(CARD_MODES) });

principessaRoutes.post("/wishes", async (req, res) => {
  const wish = await prisma.wish.create({ data: parse(WishBody, req.body) });
  broadcastChange();
  res.status(201).json({ id: wish.id, text: wish.text, mode: wish.mode });
});

// A mission he already drew keeps its own copy of the text.
principessaRoutes.delete("/wishes/:id", async (req, res) => {
  await prisma.wish.deleteMany({ where: { id: req.params.id } });
  broadcastChange();
  res.json({ ok: true });
});

// --- Discoveries ------------------------------------------------------------------

principessaRoutes.post("/discoveries/:id", async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(["CONFIRMED", "DISMISSED"]) }), req.body);
  await prisma.discovery.update({ where: { id: req.params.id }, data: { status, decidedAt: new Date() } });
  broadcastChange();
  res.json({ ok: true });
});

// --- Taking him up on an offer ------------------------------------------------------

principessaRoutes.post("/offers/:id/claim", async (req, res) => {
  const current = await prisma.currentState.findUniqueOrThrow({ where: { id: 1 } });

  const request = await prisma.$transaction(async (tx) => {
    const offer = await tx.openOffer.findUnique({ where: { id: req.params.id } });
    if (!offer || offer.status !== "OPEN" || offer.expiresAt < new Date()) {
      throw new HttpError(409, "That offer isn't open anymore.");
    }
    await tx.openOffer.update({ where: { id: offer.id }, data: { status: "CLAIMED", closedAt: new Date() } });
    return tx.careRequest.create({
      data: { kind: "OFFER", offerId: offer.id, feeling: current.feeling, mode: current.mode },
      include: requestInclude,
    });
  });

  broadcastChange();
  notifyLater("PRINCIPE", {
    title: "She took you up on it",
    body: `${request.offer?.text}.`,
    tag: `request-${request.id}`,
  });
  res.status(201).json(toRequestView(request));
});
