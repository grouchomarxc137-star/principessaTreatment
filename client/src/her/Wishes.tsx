import { useEffect, useState, type FormEvent } from "react";
import type { CardMode, WishView } from "../../../shared/types.ts";
import { api } from "../api.ts";
import { useStore } from "../store.tsx";
import { BackBar } from "../ui/Chrome.tsx";

const MODE_LABEL: Record<CardMode, string> = { ANY: "Anytime", DISTANCE: "Apart", TOGETHER: "Together" };

// Her secret wishes. He never sees this list: he draws one at random, does it
// without saying, and she finds out which one once he's done.
export function Wishes() {
  const { act, say } = useStore();
  const [wishes, setWishes] = useState<WishView[] | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<CardMode>("ANY");

  const load = () => api.get<WishView[]>("/her/wishes").then(setWishes);
  useEffect(() => {
    load();
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await act(() => api.post("/her/wishes", { text, mode }));
    if (ok) {
      setText("");
      say("Added. He'll never see the list.");
      load();
    }
  };

  const remove = async (wish: WishView) => {
    await act(() => api.delete(`/her/wishes/${wish.id}`));
    load();
  };

  return (
    <main className="app">
      <BackBar to="/me" label="Me" />
      <div className="stack">
        <section aria-labelledby="new-wish">
          <h1 id="new-wish" className="voice heading" style={{ marginBottom: 6 }}>
            Secret wishes
          </h1>
          <p className="meta" style={{ marginBottom: 14 }}>
            Little things you love when he does them, or wish he would. He never sees this list. Now and then he draws
            one and does it without telling you, and you find out which one once he has.
          </p>
          <form onSubmit={add} className="form">
            <div className="field">
              <label htmlFor="wish-text">A wish</label>
              <input
                id="wish-text"
                className="input"
                maxLength={120}
                placeholder="Bring me flowers for no reason"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <span className="meta">For when</span>
              <div className="segmented" role="group" aria-label="For when">
                {(["ANY", "DISTANCE", "TOGETHER"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn--primary" disabled={!text.trim()}>
              Add wish
            </button>
          </form>
        </section>

        <section aria-labelledby="all-wishes">
          <h2 id="all-wishes" className="voice heading" style={{ marginBottom: 12 }}>
            Your wishes
          </h2>
          {!wishes ? (
            <p className="meta">Loading your wishes…</p>
          ) : wishes.length === 0 ? (
            <p className="meta">None yet. Until you add some, he has nothing to draw.</p>
          ) : (
            <ul className="list">
              {wishes.map((w) => (
                <li key={w.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p className="voice subheading">{w.text}</p>
                    <p className="meta">{MODE_LABEL[w.mode]}</p>
                  </div>
                  <button type="button" className="textbtn" onClick={() => remove(w)} aria-label={`Remove “${w.text}”`}>
                    Remove
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
