import { useState, type FormEvent } from "react";
import { api } from "../api.ts";
import { until } from "../copy.ts";
import { useAppState, useStore } from "../store.tsx";
import { Card, CardTitle } from "../ui/Card.tsx";

const PRESETS = [
  "Free for a call",
  "I can listen",
  "Come get affection",
  "I have attention to give",
  "I can distract you",
  "I can take care of you for a bit",
];

export function Offer() {
  const s = useAppState();
  const { act, say } = useStore();
  const [text, setText] = useState("");
  const onOffer = new Map(s.offers.map((o) => [o.text, o.id]));

  const post = (value: string) =>
    act(() => api.post("/him/offers", { text: value })).then((ok) => ok && say("On offer. She'll see it."));
  const withdraw = (id: string) =>
    act(() => api.post(`/him/offers/${id}/withdraw`)).then((ok) => ok && say("Taken back."));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (await post(text.trim())) setText("");
  };

  return (
    <main className="app">
      <header className="page-head">
        <h1 className="voice heading">What can you give right now?</h1>
        <p className="meta" style={{ marginTop: 6 }}>
          Tap to put it on offer. She can take it any time in the next 12 hours.
        </p>
      </header>

      <div className="stack">
        <div className="chips" role="group" aria-label="Offers">
          {PRESETS.map((p) => {
            const id = onOffer.get(p);
            return (
              <button key={p} type="button" className="chip" aria-pressed={Boolean(id)} onClick={() => (id ? withdraw(id) : post(p))}>
                {p}
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} className="field">
          <label htmlFor="offer-text">Something else</label>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input
              id="offer-text"
              className="input"
              maxLength={80}
              placeholder="Come for a walk with me"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={!text.trim()}>
              Offer
            </button>
          </div>
        </form>

        {s.offers.length > 0 && (
          <section aria-labelledby="on-offer" className="stack">
            <h2 id="on-offer" className="voice subheading">
              On offer now
            </h2>
            {s.offers.map((o) => (
              <Card his key={o.id} className="card--request">
                <CardTitle>{o.text}</CardTitle>
                <p className="card__note">Open {until(o.expiresAt)}</p>
                <div>
                  <button type="button" className="textbtn" onClick={() => withdraw(o.id)}>
                    Take it back
                  </button>
                </div>
              </Card>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
