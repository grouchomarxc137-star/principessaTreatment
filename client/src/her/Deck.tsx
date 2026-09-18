import { useEffect, useMemo, useRef, useState } from "react";
import type { AppState, CardView } from "../../../shared/types.ts";
import { api } from "../api.ts";
import { FEELING } from "../copy.ts";
import { useRouter } from "../router.tsx";
import { useAppState, useStore } from "../store.tsx";
import { Card, CardTitle } from "../ui/Card.tsx";

interface DeckCard extends CardView {
  note: string | null;
}

// Cards for the current mode. Anything she's confirmed helps with how she
// feels right now goes to the front.
function deckFor(s: AppState): DeckCard[] {
  const notes = new Map<string, { note: string; rank: number }>();
  for (const d of s.discoveries) {
    if (d.status !== "CONFIRMED" || !d.card) continue;
    if (d.feeling && d.feeling === s.feeling) {
      notes.set(d.card.id, { note: `Helps when you're ${FEELING[d.feeling].when}`, rank: 0 });
    } else if (!d.feeling && !notes.has(d.card.id)) {
      notes.set(d.card.id, { note: "Tends to help you", rank: 1 });
    }
  }
  return s.cards
    .filter((c) => c.mode === "ANY" || c.mode === s.mode)
    .map((c) => ({ ...c, note: notes.get(c.id)?.note ?? null, rank: notes.get(c.id)?.rank ?? 2 }))
    .sort((a, b) => a.rank - b.rank);
}

export function Deck() {
  const s = useAppState();
  const { act, say } = useStore();
  const { query, navigate } = useRouter();
  const forMe = query.get("for") === "me";
  const cards = useMemo(() => deckFor(s), [s]);
  const [index, setIndex] = useState(0);
  const [sending, setSending] = useState<string | null>(null);
  const track = useRef<HTMLDivElement>(null);

  // Which card is centred.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const middle = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let bestDistance = Infinity;
        Array.from(el.children).forEach((child, i) => {
          const c = child as HTMLElement;
          const distance = Math.abs(c.offsetLeft + c.offsetWidth / 2 - middle);
          if (distance < bestDistance) {
            best = i;
            bestDistance = distance;
          }
        });
        setIndex(best);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const card = cards[Math.min(index, cards.length - 1)];

  const ask = async () => {
    if (!card || sending) return;
    setSending(card.id);
    const done = await act(() => api.post("/requests", { cardId: card.id, onMyBehalf: forMe }));
    if (!done) {
      setSending(null);
      return;
    }
    window.setTimeout(
      () => {
        say(forMe ? "Asked for you. He'll see it." : "Sent. He'll see it.");
        navigate("/");
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 480,
    );
  };

  const setForMe = (on: boolean) => navigate(on ? "/deck?for=me" : "/deck", { replace: true });

  return (
    <main className="app deck-screen">
      <header className="topbar">
        <p className="meta">{s.mode === "TOGETHER" ? "For when you're together" : "For when you're apart"}</p>
        <div className="segmented" role="group" aria-label="Who asks">
          <button type="button" aria-pressed={!forMe} onClick={() => setForMe(false)}>
            I'll ask
          </button>
          <button type="button" aria-pressed={forMe} onClick={() => setForMe(true)}>
            Ask for me
          </button>
        </div>
      </header>

      {forMe && <p className="lede">Pick what you'd like. The app asks him for you, so you don't have to.</p>}

      <div className="deck-body">
        <div
          className="deck"
          ref={track}
          role="listbox"
          aria-label="Care cards"
          aria-activedescendant={card ? `card-${card.id}` : undefined}
          tabIndex={0}
          onKeyDown={(e) => {
            const el = track.current;
            if (!el) return;
            if (e.key === "ArrowRight") el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
            if (e.key === "ArrowLeft") el.scrollBy({ left: -el.clientWidth * 0.8, behavior: "smooth" });
            if (e.key === "Enter") ask();
          }}
        >
          {cards.map((c, i) => (
            <Card
              key={c.id}
              id={`card-${c.id}`}
              role="option"
              aria-selected={i === index}
              className={`card--deck ${sending === c.id ? "is-sent" : ""}`}
            >
              <CardTitle>{c.title}</CardTitle>
              {c.note && <p className="card__note">{c.note}</p>}
            </Card>
          ))}
        </div>

        <button type="button" className="btn btn--block btn--primary" onClick={ask} disabled={!card || Boolean(sending)}>
          {forMe ? "Ask him for me" : "Ask for this"}
        </button>
      </div>
    </main>
  );
}
