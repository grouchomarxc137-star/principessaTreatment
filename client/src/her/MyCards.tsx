import { useEffect, useState, type FormEvent } from "react";
import type { CardMode, CardView } from "../../../shared/types.ts";
import { api } from "../api.ts";
import { useStore } from "../store.tsx";
import { BackBar } from "../ui/Chrome.tsx";

const MODE_LABEL: Record<CardMode, string> = { ANY: "Anytime", DISTANCE: "Apart", TOGETHER: "Together" };

export function MyCards() {
  const { act, say } = useStore();
  const [cards, setCards] = useState<CardView[] | null>(null);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<CardMode>("ANY");

  const load = () => api.get<CardView[]>("/her/cards").then(setCards);
  useEffect(() => {
    load();
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await act(() => api.post("/her/cards", { title, mode }));
    if (ok) {
      setTitle("");
      say("Added to your deck.");
      load();
    }
  };

  const setHidden = async (card: CardView, hidden: boolean) => {
    await act(() => api.patch(`/her/cards/${card.id}`, { hidden }));
    load();
  };

  return (
    <main className="app">
      <BackBar to="/me" label="Me" />
      <div className="stack">
        <section aria-labelledby="new-card">
          <h1 id="new-card" className="voice heading" style={{ marginBottom: 14 }}>
            Make a card
          </h1>
          <form onSubmit={add} className="form">
            <div className="field">
              <label htmlFor="card-title">In your words</label>
              <input
                id="card-title"
                className="input"
                maxLength={60}
                placeholder="Rub my back"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <span className="meta">Show it</span>
              <div className="segmented" role="group" aria-label="When to show it">
                {(["ANY", "DISTANCE", "TOGETHER"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
              Add to deck
            </button>
          </form>
        </section>

        <section aria-labelledby="all-cards">
          <h2 id="all-cards" className="voice heading" style={{ marginBottom: 12 }}>
            Your deck
          </h2>
          {!cards ? (
            <p className="meta">Loading your cards…</p>
          ) : (
            <ul className="list">
              {cards.map((c) => (
                <li key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ opacity: c.hidden ? 0.55 : 1 }}>
                    <p className="voice subheading">{c.title}</p>
                    <p className="meta">
                      {MODE_LABEL[c.mode]}
                      {c.hidden ? ", out of the deck" : ""}
                    </p>
                  </div>
                  <button type="button" className="textbtn" onClick={() => setHidden(c, !c.hidden)}>
                    {c.hidden ? "Put back" : "Take out"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
