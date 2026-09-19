import { Router } from "express";
import { z } from "zod";
import { HELPED, RESPONSE_KINDS, type RequestKind } from "../../../shared/types.ts";
import { prisma } from "../db.ts";
import { refreshDiscoveries } from "../discoveries.ts";
import { HttpError, currentUser, parse, requireRole } from "../http.ts";
import { notifyLater } from "../notify.ts";
import { broadcastChange } from "../realtime.ts";
import { requestInclude, toRequestView } from "../state.ts";

// The core loop: she asks, he answers, she can later say whether it helped.

export const careRoutes = Router();

async function snapshot() {
  const current = await prisma.currentState.findUniqueOrThrow({ where: { id: 1 } });
  return { feeling: current.feeling, mode: current.mode };
}

async function findOpen(kind: RequestKind, cardId?: string) {
  return prisma.careRequest.findFirst({
    where: { kind, status: "OPEN", ...(cardId ? { cardId } : {}) },
    include: requestInclude,
  });
}

async function loadRequest(id: string) {
  const request = await prisma.careRequest.findUnique({ where: { id }, include: requestInclude });
  if (!request) throw new HttpError(404, "That request no longer exists.");
  return request;
}

// --- Asking -----------------------------------------------------------------

const AskBody = z.object({ cardId: z.string().min(1) });

careRoutes.post("/requests", async (req, res) => {
  requireRole(req, "PRINCIPESSA");
  const { cardId } = parse(AskBody, req.body);
  const card = await prisma.careCard.findUnique({ where: { id: cardId } });
  if (!card || card.hidden) throw new HttpError(404, "That card isn't in the deck.");

  const existing = await findOpen("CARD", card.id);
  if (existing) return res.json(toRequestView(existing));

  const request = await prisma.careRequest.create({
    data: { kind: "CARD", cardId: card.id, ...(await snapshot()) },
    include: requestInclude,
  });
  broadcastChange();
  notifyLater("PRINCIPE", { title: "Principessa is asking", body: `${card.title}.`, tag: `request-${request.id}` });
  res.status(201).json(toRequestView(request));
});

careRoutes.post("/sos", async (req, res) => {
  requireRole(req, "PRINCIPESSA");
  // Pressing again while one is open just nudges him again.
  const request =
    (await findOpen("SOS")) ??
    (await prisma.careRequest.create({ data: { kind: "SOS", ...(await snapshot()) }, include: requestInclude }));
  broadcastChange();
  notifyLater("PRINCIPE", {
    title: "Principessa needs you",
    body: "She pressed SOS. No details, just you.",
    tag: "sos",
    urgent: true,
  });
  res.status(201).json(toRequestView(request));
});

careRoutes.post("/handle-me", async (req, res) => {
  requireRole(req, "PRINCIPESSA");
  const request =
    (await findOpen("HANDLE_ME")) ??
    (await prisma.careRequest.create({ data: { kind: "HANDLE_ME", ...(await snapshot()) }, include: requestInclude }));
  broadcastChange();
  notifyLater("PRINCIPE", {
    title: "She's handed it to you",
    body: "Principessa doesn't want to decide. You choose how to take care of her.",
    tag: `request-${request.id}`,
  });
  res.status(201).json(toRequestView(request));
});

// "I can't ask for it": a quiet signal with no card and no details. Older
// CANT_ASK requests may still carry a card from when it went through the deck.
careRoutes.post("/quiet", async (req, res) => {
  requireRole(req, "PRINCIPESSA");
  const request =
    (await findOpen("CANT_ASK")) ??
    (await prisma.careRequest.create({ data: { kind: "CANT_ASK", ...(await snapshot()) }, include: requestInclude }));
  broadcastChange();
  notifyLater("PRINCIPE", {
    title: "She could use some extra love",
    body: "Don't ask, just be sweet to her.",
    tag: `request-${request.id}`,
  });
  res.status(201).json(toRequestView(request));
});

// --- Answering ----------------------------------------------------------------

const RespondBody = z.object({
  kind: z.enum(RESPONSE_KINDS),
  // Handle-me only: what he's decided to do.
  chosenCardId: z.string().min(1).optional(),
});

const RESPONSE_PUSH = {
  ON_IT: "He's on it.",
  LITTLE_BIT: "He'll be there in a little bit.",
  CANT_NOW: "He can't right now, but he's here.",
} as const;

careRoutes.post("/requests/:id/respond", async (req, res) => {
  const me = requireRole(req, "PRINCIPE");
  const { kind, chosenCardId } = parse(RespondBody, req.body);
  const request = await loadRequest(req.params.id);
  if (request.status !== "OPEN") throw new HttpError(409, "This one is already closed.");
  if (chosenCardId && !(await prisma.careCard.findUnique({ where: { id: chosenCardId } }))) {
    throw new HttpError(404, "That card isn't in the deck.");
  }

  await prisma.careResponse.create({
    data: { requestId: request.id, kind, chosenCardId: request.kind === "HANDLE_ME" ? chosenCardId : undefined },
  });
  broadcastChange();
  notifyLater("PRINCIPESSA", { title: me.name, body: RESPONSE_PUSH[kind], tag: `request-${request.id}` });
  res.json(toRequestView(await loadRequest(request.id)));
});

// Either of them can say it's been taken care of.
careRoutes.post("/requests/:id/done", async (req, res) => {
  currentUser(req);
  const request = await loadRequest(req.params.id);
  if (request.status === "OPEN") {
    await prisma.careRequest.update({ where: { id: request.id }, data: { status: "DONE", closedAt: new Date() } });
    broadcastChange();
  }
  res.json(toRequestView(await loadRequest(request.id)));
});

// She takes it back.
careRoutes.post("/requests/:id/cancel", async (req, res) => {
  requireRole(req, "PRINCIPESSA");
  const request = await loadRequest(req.params.id);
  if (request.status === "OPEN") {
    await prisma.careRequest.update({ where: { id: request.id }, data: { status: "CANCELLED", closedAt: new Date() } });
    broadcastChange();
  }
  res.json(toRequestView(await loadRequest(request.id)));
});

// --- Aftercare: she answers, both see it ------------------------------------------------------

const AftercareBody = z.object({
  helped: z.enum(HELPED),
  note: z.string().trim().max(280).optional(),
});

careRoutes.post("/requests/:id/aftercare", async (req, res) => {
  requireRole(req, "PRINCIPESSA");
  const { helped, note } = parse(AftercareBody, req.body);
  const request = await loadRequest(req.params.id);
  if (request.status === "CANCELLED") throw new HttpError(409, "That one was taken back, so there's nothing to rate.");

  await prisma.$transaction([
    prisma.careRequest.update({
      where: { id: request.id },
      data: { status: "DONE", closedAt: request.closedAt ?? new Date() },
    }),
    prisma.aftercare.upsert({
      where: { requestId: request.id },
      create: { requestId: request.id, helped, note: note || null },
      update: { helped, note: note || null },
    }),
  ]);
  await refreshDiscoveries();
  broadcastChange();
  res.json(toRequestView(await loadRequest(request.id)));
});

careRoutes.post("/requests/:id/aftercare/skip", async (req, res) => {
  requireRole(req, "PRINCIPESSA");
  await prisma.careRequest.update({ where: { id: req.params.id }, data: { aftercareSkipped: true } });
  broadcastChange();
  res.json(toRequestView(await loadRequest(req.params.id)));
});

// --- History ------------------------------------------------------------------

careRoutes.get("/history", async (req, res) => {
  currentUser(req);
  const rows = await prisma.careRequest.findMany({
    include: requestInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(rows.map(toRequestView));
});
