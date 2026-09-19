import { useState } from "react";
import { api } from "../api.ts";
import { useAppState, useStore } from "../store.tsx";
import { Card, CardBack } from "../ui/Card.tsx";

// One of her secret wishes, drawn at random. He never sees her list, only the
// wish he draws; she finds out which one once he's done it.
export function Mystery() {
  const s = useAppState();
  const { act, say } = useStore();
  const mission = s.mission;
  const [open, setOpen] = useState(Boolean(mission));
  const [busy, setBusy] = useState(false);

  const draw = async () => {
    setBusy(true);
    setOpen(false);
    // Let the card finish turning face down before the new one arrives.
    await new Promise((r) => setTimeout(r, mission ? 380 : 0));
    const ok = await act(() => api.post("/him/mystery/draw"));
    setBusy(false);
    if (ok) requestAnimationFrame(() => setOpen(true));
  };

  const done = () =>
    act(() => api.post(`/him/mystery/${mission!.id}/done`)).then((ok) => {
      if (!ok) return;
      setOpen(false);
      say("Done. Now she'll see you granted one of her wishes.");
    });

  return (
    <main className="app">
      <header className="page-head">
        <h1 className="voice heading">Her secret wishes</h1>
        <p className="meta" style={{ marginTop: 6 }}>
          Things she's written down that she loves you doing. Draw one for when you're{" "}
          {s.mode === "TOGETHER" ? "together" : "apart"}, do it without saying, and she finds out once you've done it.
        </p>
      </header>

      {!mission && s.wishesToDraw === 0 ? (
        <div className="empty">
          <p className="voice">No wishes to draw yet.</p>
          <p className="meta">
            She hasn't written any wishes for when you're {s.mode === "TOGETHER" ? "together" : "apart"}. They'll show up
            here face down once she does.
          </p>
        </div>
      ) : (
        <>
          <div className={`flip ${open && mission ? "is-open" : ""}`}>
            <div className="flip__inner">
              <div className="flip__face" aria-hidden={open}>
                <CardBack />
              </div>
              <div className="flip__face flip__face--front" aria-hidden={!open} aria-live="polite">
                {mission && (
                  <Card>
                    <p className="card__title">“{mission.text}”</p>
                    <p className="card__note">In her words</p>
                  </Card>
                )}
              </div>
            </div>
          </div>

          <div className="buttons" style={{ marginTop: 28 }}>
            {mission && open ? (
              <>
                <button type="button" className="btn btn--primary" onClick={done} disabled={busy}>
                  Mark as done
                </button>
                {s.wishesToDraw > 1 && (
                  <button type="button" className="btn" onClick={draw} disabled={busy}>
                    Draw another
                  </button>
                )}
              </>
            ) : mission ? (
              <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
                Turn it over
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={draw} disabled={busy}>
                Draw a wish
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
