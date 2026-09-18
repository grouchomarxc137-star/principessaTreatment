import { useState } from "react";
import { api } from "../api.ts";
import { useAppState, useStore } from "../store.tsx";
import { Card, CardBack } from "../ui/Card.tsx";

// A secret mission for him. She never sees these.
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
      say("Marked as done. Now she'll see it was a mission.");
    });

  return (
    <main className="app">
      <header className="page-head">
        <h1 className="voice heading">Mystery care</h1>
        <p className="meta" style={{ marginTop: 6 }}>
          A secret way to take care of her, picked for when you're {s.mode === "TOGETHER" ? "together" : "apart"}. She
          only finds out once you've done it.
        </p>
      </header>

      <div className={`flip ${open && mission ? "is-open" : ""}`}>
        <div className="flip__inner">
          <div className="flip__face" aria-hidden={open}>
            <CardBack />
          </div>
          <div className="flip__face flip__face--front" aria-hidden={!open} aria-live="polite">
            {mission && (
              <Card his>
                <p className="card__title">{mission.text}</p>
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
            <button type="button" className="btn" onClick={draw} disabled={busy}>
              Draw another
            </button>
          </>
        ) : mission ? (
          <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
            Turn it over
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={draw} disabled={busy}>
            Draw a mission
          </button>
        )}
      </div>
    </main>
  );
}
