import type { Feeling } from "../../shared/types.ts";
import { prisma } from "./db.ts";

// Plain counting over aftercare answers. A pattern becomes a suggestion when
// the same kind of care, asked for while feeling the same way, has mostly
// helped a lot. She confirms or dismisses each one; dismissed patterns are
// never suggested again.

const SCORE = { A_LOT: 2, A_LITTLE: 1, NOT_REALLY: 0 } as const;
const MIN_WITH_FEELING = 3;
const MIN_OVERALL = 4;
const MIN_AVERAGE = 1.5;

interface Group {
  feeling: Feeling | null;
  cardId: string | null;
  handleMe: boolean;
  scores: number[];
}

export async function refreshDiscoveries() {
  const rows = await prisma.aftercare.findMany({
    include: {
      request: {
        include: { responses: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  const groups = new Map<string, Group>();
  const add = (feeling: Feeling | null, care: string, cardId: string | null, handleMe: boolean, score: number) => {
    const key = `${feeling ?? "ANY"}:${care}`;
    const group = groups.get(key) ?? { feeling, cardId, handleMe, scores: [] };
    group.scores.push(score);
    groups.set(key, group);
  };

  for (const { helped, request } of rows) {
    const score = SCORE[helped];
    const cares: { care: string; cardId: string | null; handleMe: boolean }[] = [];

    if ((request.kind === "CARD" || request.kind === "CANT_ASK") && request.cardId) {
      cares.push({ care: `card:${request.cardId}`, cardId: request.cardId, handleMe: false });
    }
    if (request.kind === "HANDLE_ME") {
      cares.push({ care: "handle-me", cardId: null, handleMe: true });
      const chosen = request.responses[0]?.chosenCardId;
      if (chosen) cares.push({ care: `card:${chosen}`, cardId: chosen, handleMe: false });
    }

    for (const c of cares) {
      if (request.feeling) add(request.feeling, c.care, c.cardId, c.handleMe, score);
      add(null, c.care, c.cardId, c.handleMe, score);
    }
  }

  const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const holds = (g: Group) =>
    g.scores.length >= (g.feeling ? MIN_WITH_FEELING : MIN_OVERALL) && average(g.scores) >= MIN_AVERAGE;

  const holding = new Set<string>();
  for (const [key, group] of groups) {
    if (!holds(group)) continue;
    // "Voice notes help" adds nothing next to "voice notes help when you're overwhelmed".
    const care = key.slice(key.indexOf(":") + 1);
    const specific = !group.feeling && [...groups].some(([k, g]) => g.feeling && k.endsWith(`:${care}`) && holds(g));
    if (specific) continue;
    holding.add(key);
  }

  const existing = await prisma.discovery.findMany();
  const known = new Map(existing.map((d) => [d.key, d]));

  for (const key of holding) {
    const group = groups.get(key)!;
    const found = known.get(key);
    if (found) {
      await prisma.discovery.update({ where: { key }, data: { sampleSize: group.scores.length } });
    } else {
      await prisma.discovery.create({
        data: {
          key,
          feeling: group.feeling,
          cardId: group.cardId,
          handleMe: group.handleMe,
          sampleSize: group.scores.length,
        },
      });
    }
  }

  // A suggestion she hasn't answered yet goes away if the pattern stops holding.
  const stale = existing.filter((d) => d.status === "SUGGESTED" && !holding.has(d.key)).map((d) => d.id);
  if (stale.length) await prisma.discovery.deleteMany({ where: { id: { in: stale } } });
}
