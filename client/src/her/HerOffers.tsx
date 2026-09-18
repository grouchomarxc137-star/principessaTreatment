import { api } from "../api.ts";
import { until } from "../copy.ts";
import { Link, useRouter } from "../router.tsx";
import { useAppState, useStore } from "../store.tsx";
import { Card, CardTitle } from "../ui/Card.tsx";

// What he's put on offer. His voice, so slate blue rather than raspberry.
export function HerOffers() {
  const s = useAppState();
  const { act, say } = useStore();
  const { navigate } = useRouter();

  const take = (id: string) =>
    act(() => api.post(`/her/offers/${id}/claim`)).then((r) => {
      if (!r) return;
      say("Taken. He's been told.");
      navigate("/");
    });

  return (
    <main className="app">
      <header className="topbar">
        <h1 className="voice heading">From him</h1>
      </header>

      {s.offers.length === 0 ? (
        <div className="empty">
          <p className="voice">Nothing on offer right now.</p>
          <p className="meta">When he has time or attention to give, it shows up here. You can always ask.</p>
          <Link to="/deck" className="btn btn--primary" style={{ marginTop: 20 }}>
            Open the deck
          </Link>
        </div>
      ) : (
        <div className="stack">
          {s.offers.map((o) => (
            <Card his key={o.id} className="offer">
              <CardTitle>{o.text}</CardTitle>
              <p className="card__note" style={{ marginBottom: 14 }}>
                Open {until(o.expiresAt)}
              </p>
              <button type="button" className="btn btn--primary" onClick={() => take(o.id)}>
                Take it
              </button>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
