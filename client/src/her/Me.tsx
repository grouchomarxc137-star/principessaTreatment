import { useState, type FormEvent } from "react";
import type { PreferenceKind, PreferenceView } from "../../../shared/types.ts";
import { api } from "../api.ts";
import { discoveryText } from "../copy.ts";
import { Link } from "../router.tsx";
import { useAppState, useStore } from "../store.tsx";
import { AccountSection } from "../Account.tsx";

export function Me() {
  const s = useAppState();
  return (
    <main className="app">
      <div className="stack page-top">
        <HowToTreatMe prefs={s.preferences} />
        <WhatHelps />
        <nav aria-label="More">
          <ul className="list">
            <li>
              <Link to="/me/wishes" className="list-link">
                Secret wishes
              </Link>
            </li>
            <li>
              <Link to="/me/cards" className="list-link">
                My cards
              </Link>
            </li>
            <li>
              <Link to="/history" className="list-link">
                History
              </Link>
            </li>
          </ul>
        </nav>
        <AccountSection />
      </div>
    </main>
  );
}

function HowToTreatMe({ prefs }: { prefs: PreferenceView[] }) {
  const { act } = useStore();
  const [kind, setKind] = useState<PreferenceKind>("DO");
  const [text, setText] = useState("");
  const anyActive = prefs.some((p) => p.active);

  const toggle = (p: PreferenceView) => act(() => api.post(`/her/preferences/${p.id}/toggle`, { on: !p.active }));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const ok = await act(() => api.post("/her/preferences", { kind, text }));
    if (ok) setText("");
  };

  const group = (k: PreferenceKind, label: string) => (
    <div style={{ marginTop: 18 }}>
      <h3 className="voice subheading" style={{ marginBottom: 10 }}>
        {label}
      </h3>
      <div className="chips">
        {prefs
          .filter((p) => p.kind === k)
          .map((p) => (
            <span key={p.id} style={{ display: "inline-flex", alignItems: "center" }}>
              <button type="button" className="chip" aria-pressed={p.active} onClick={() => toggle(p)}>
                {p.text}
              </button>
              {p.isCustom && !p.active && (
                <button
                  type="button"
                  className="textbtn"
                  style={{ marginLeft: 6, fontSize: "var(--t-14)" }}
                  aria-label={`Remove “${p.text}”`}
                  onClick={() => act(() => api.delete(`/her/preferences/${p.id}`))}
                >
                  Remove
                </button>
              )}
            </span>
          ))}
      </div>
    </div>
  );

  return (
    <section aria-labelledby="treat-heading">
      <div className="section-head">
        <h2 id="treat-heading" className="voice heading">
          How to treat me
        </h2>
        {anyActive && (
          <button type="button" className="textbtn" onClick={() => act(() => api.post("/her/preferences/clear"))}>
            Clear all
          </button>
        )}
      </div>
      <p className="meta">Right now, not forever. Anything you switch on turns itself off after a day.</p>
      {group("DO", "Do")}
      {group("DONT", "Don't")}

      <form onSubmit={add} style={{ marginTop: 20 }} className="field">
        <label htmlFor="pref-text">Add your own</label>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <div className="segmented" role="group" aria-label="Do or don't">
            <button type="button" aria-pressed={kind === "DO"} onClick={() => setKind("DO")}>
              Do
            </button>
            <button type="button" aria-pressed={kind === "DONT"} onClick={() => setKind("DONT")}>
              Don't
            </button>
          </div>
          <input
            id="pref-text"
            className="input"
            maxLength={60}
            placeholder={kind === "DO" ? "Hold my hand" : "Make jokes about it"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn--small btn--primary" style={{ justifySelf: "start" }} disabled={!text.trim()}>
          Add and switch on
        </button>
      </form>
    </section>
  );
}

function WhatHelps() {
  const s = useAppState();
  const { act } = useStore();
  const suggested = s.discoveries.filter((d) => d.status === "SUGGESTED");
  const confirmed = s.discoveries.filter((d) => d.status === "CONFIRMED");

  const decide = (id: string, status: "CONFIRMED" | "DISMISSED") => act(() => api.post(`/her/discoveries/${id}`, { status }));

  return (
    <section aria-labelledby="helps-heading">
      <h2 id="helps-heading" className="voice heading" style={{ marginBottom: 6 }}>
        What helps
      </h2>
      {suggested.length === 0 && confirmed.length === 0 && (
        <p className="meta">
          Each time you say whether something helped, the app counts it. Once a pattern shows up a few times, it
          appears here for you to confirm. He sees the ones you confirm.
        </p>
      )}

      {suggested.map((d) => {
        const t = discoveryText(d, "her");
        return (
          <article key={d.id} className="ticket" style={{ marginTop: 12 }}>
            <p className="discovery">
              {t.lead}
              {t.card && <span className="voice">“{t.card}”</span>}
              {t.tail}
            </p>
            <p className="meta">Based on {d.sampleSize} times. Is that right?</p>
            <div className="row">
              <button type="button" className="btn btn--small btn--primary" onClick={() => decide(d.id, "CONFIRMED")}>
                Yes, keep it
              </button>
              <button type="button" className="textbtn" onClick={() => decide(d.id, "DISMISSED")}>
                Not really
              </button>
            </div>
          </article>
        );
      })}

      {confirmed.length > 0 && (
        <ul className="list" style={{ marginTop: 16 }}>
          {confirmed.map((d) => {
            const t = discoveryText(d, "her");
            return (
              <li key={d.id} className="discovery">
                {t.lead}
                {t.card && <span className="voice">“{t.card}”</span>}
                {t.tail}{" "}
                <button type="button" className="textbtn" style={{ minHeight: 0 }} onClick={() => decide(d.id, "DISMISSED")}>
                  Forget this
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
