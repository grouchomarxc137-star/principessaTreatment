import type {
  AppState,
  CardView,
  DiscoveryView,
  Me,
  PreferenceView,
  RequestView,
} from "../../shared/types.ts";
import type { Prisma } from "../generated/prisma/client.ts";
import { AFTERCARE_DAYS, PREFERENCE_HOURS } from "./catalog.ts";
import { prisma } from "./db.ts";
import { pushConfigured } from "./notify.ts";

const HOUR = 60 * 60 * 1000;

export const requestInclude = {
  card: true,
  offer: true,
  mission: true,
  aftercare: true,
  responses: { orderBy: { createdAt: "desc" }, take: 1, include: { chosenCard: true } },
} satisfies Prisma.CareRequestInclude;

type RequestRow = Prisma.CareRequestGetPayload<{ include: typeof requestInclude }>;

const cardRef = (c: { id: string; title: string; forHim: string } | null) =>
  c ? { id: c.id, title: c.title, forHim: c.forHim } : null;

export function toRequestView(r: RequestRow): RequestView {
  const latest = r.responses[0];
  return {
    id: r.id,
    kind: r.kind,
    status: r.status,
    card: cardRef(r.card),
    offerText: r.offer?.text ?? null,
    missionText: r.mission?.text ?? null,
    feeling: r.feeling,
    mode: r.mode,
    createdAt: r.createdAt.toISOString(),
    closedAt: r.closedAt?.toISOString() ?? null,
    response: latest
      ? { kind: latest.kind, chosenCard: cardRef(latest.chosenCard), at: latest.createdAt.toISOString() }
      : null,
    aftercare: r.aftercare ? { helped: r.aftercare.helped, note: r.aftercare.note } : null,
  };
}

export function toCardView(c: {
  id: string;
  title: string;
  forHim: string;
  mode: CardView["mode"];
  isCustom: boolean;
  hidden: boolean;
}): CardView {
  return { id: c.id, title: c.title, forHim: c.forHim, mode: c.mode, isCustom: c.isCustom, hidden: c.hidden };
}

export function preferenceIsActive(activeSince: Date | null) {
  return activeSince !== null && Date.now() - activeSince.getTime() < PREFERENCE_HOURS * HOUR;
}

export async function buildState(me: Me): Promise<AppState> {
  const isHer = me.role === "PRINCIPESSA";
  const now = new Date();

  const [current, partner, active, pending, preferences, offers, discoveries, cards, mission, wishes] =
    await Promise.all([
      prisma.currentState.findUniqueOrThrow({ where: { id: 1 } }),
      prisma.user.findFirst({ where: { NOT: { id: me.id } }, select: { name: true } }),
      prisma.careRequest.findMany({
        where: { status: "OPEN" },
        include: requestInclude,
        orderBy: { createdAt: "desc" },
      }),
      isHer
        ? prisma.careRequest.findMany({
            where: {
              status: "DONE",
              aftercare: { is: null },
              aftercareSkipped: false,
              closedAt: { gte: new Date(now.getTime() - AFTERCARE_DAYS * 24 * HOUR) },
            },
            include: requestInclude,
            orderBy: { closedAt: "desc" },
            take: 3,
          })
        : [],
      prisma.preference.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.openOffer.findMany({
        where: { status: "OPEN", expiresAt: { gt: now } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.discovery.findMany({
        where: { status: isHer ? { in: ["SUGGESTED", "CONFIRMED"] } : "CONFIRMED" },
        include: { card: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.careCard.findMany({
        where: { hidden: false },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      isHer
        ? null
        : prisma.mysteryMission.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
      isHer ? [] : prisma.wish.findMany({ select: { mode: true } }),
    ]);

  const preferenceViews: PreferenceView[] = preferences
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      text: p.text,
      isCustom: p.isCustom,
      active: preferenceIsActive(p.activeSince),
      activeSince: p.activeSince?.toISOString() ?? null,
    }))
    .filter((p) => isHer || p.active);

  const discoveryViews: DiscoveryView[] = discoveries.map((d) => ({
    id: d.id,
    status: d.status,
    feeling: d.feeling,
    card: cardRef(d.card),
    handleMe: d.handleMe,
    sampleSize: d.sampleSize,
  }));

  return {
    me,
    partnerName: partner?.name ?? (isHer ? "Principe" : "Principessa"),
    feeling: current.feeling,
    feelingSince: current.feelingSince?.toISOString() ?? null,
    mode: current.mode,
    modeSince: current.modeSince.toISOString(),
    active: active.map(toRequestView),
    aftercarePending: pending.map(toRequestView),
    preferences: preferenceViews,
    offers: offers.map((o) => ({
      id: o.id,
      text: o.text,
      createdAt: o.createdAt.toISOString(),
      expiresAt: o.expiresAt.toISOString(),
    })),
    discoveries: discoveryViews,
    cards: cards.map(toCardView),
    mission: mission ? { id: mission.id, text: mission.text, createdAt: mission.createdAt.toISOString() } : null,
    wishesToDraw: wishes.filter((w) => w.mode === "ANY" || w.mode === current.mode).length,
    pushConfigured,
  };
}
