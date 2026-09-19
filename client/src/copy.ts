import type { DiscoveryView, Feeling, Helped, Mode, RequestView, ResponseKind } from "../../shared/types.ts";

// Words the app uses in more than one place. Her side speaks as her; his
// side speaks about her.

export const FEELING: Record<Feeling, { chip: string; mine: string; hers: string; when: string }> = {
  OVERWHELMED: { chip: "Overwhelmed", mine: "I'm overwhelmed.", hers: "She's overwhelmed.", when: "overwhelmed" },
  LOW_ENERGY: { chip: "Low on energy", mine: "I'm low on energy.", hers: "She's low on energy.", when: "low on energy" },
  NEEDY: { chip: "Needy", mine: "I'm feeling needy.", hers: "She's feeling needy.", when: "feeling needy" },
  UPSET: { chip: "Upset", mine: "I'm upset.", hers: "She's upset.", when: "upset" },
  MISSING_HIM: { chip: "Missing you", mine: "I miss you.", hers: "She misses you.", when: "missing him" },
  OKAY: { chip: "Okay", mine: "I'm okay.", hers: "She's okay.", when: "okay" },
  GOOD: { chip: "Good", mine: "I'm good.", hers: "She's good.", when: "good" },
};

export const MODE_NAME: Record<Mode, string> = { DISTANCE: "Distance", TOGETHER: "Together" };

// What he taps.
export const RESPONSE_BUTTON: Record<ResponseKind, string> = {
  ON_IT: "I'm on it",
  LITTLE_BIT: "Give me a little bit",
  CANT_NOW: "I can't right now, but I'm here",
};

// What she reads back.
export const RESPONSE_SEEN: Record<ResponseKind, string> = {
  ON_IT: "He's on it.",
  LITTLE_BIT: "He'll be there in a little bit.",
  CANT_NOW: "He can't right now, but he's here.",
};

export const HELPED_LABEL: Record<Helped, string> = {
  A_LOT: "Helped a lot",
  A_LITTLE: "Helped a little",
  NOT_REALLY: "Didn't really help",
};

// A short name for a request, in her voice.
export function requestTitle(r: RequestView, side: "her" | "him" = "her"): string {
  switch (r.kind) {
    case "SOS":
      return "I need you";
    case "HANDLE_ME":
      return "You decide";
    case "OFFER":
      return r.offerText ?? "His offer";
    case "MYSTERY":
      return side === "her" ? "One of your wishes" : "Her secret wish";
    case "CANT_ASK":
      if (r.card) return r.card.title;
      return side === "her" ? "I can't ask for it" : "Extra love, no questions";
    default:
      return r.card?.title ?? "A card you've since removed";
  }
}

export function discoveryText(d: DiscoveryView, side: "her" | "him"): { lead: string; card: string | null; tail: string } {
  const who = side === "her" ? "you" : "her";
  const when = d.feeling
    ? side === "her"
      ? `When you're ${FEELING[d.feeling].when}, `
      : `When she's ${FEELING[d.feeling].when.replace("missing him", "missing you")}, `
    : "";
  if (d.handleMe) {
    const decide = side === "her" ? "letting him decide" : "deciding for her";
    return { lead: when ? when + decide : cap(decide), card: null, tail: ` tends to help${when ? "" : ` ${who}`}.` };
  }
  return { lead: when, card: d.card?.title ?? "that card", tail: ` tends to help${when ? "" : ` ${who}`}.` };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// --- Time ---------------------------------------------------------------------

// English words to match the copy, 24-hour clock.
const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

// "14:05", "yesterday at 14:05", "tomorrow at 03:30", "Tuesday at 14:05", "3 Sep"
export function when(iso: string): string {
  const then = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);
  const time = clock.format(then);
  if (days === 0) return time;
  if (days === 1) return `yesterday at ${time}`;
  if (days === -1) return `tomorrow at ${time}`;
  if (Math.abs(days) < 7) return `${weekday.format(then)} at ${time}`;
  return date.format(then);
}

export function since(iso: string): string {
  return `since ${when(iso)}`;
}

export function until(iso: string): string {
  return `until ${when(iso)}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
