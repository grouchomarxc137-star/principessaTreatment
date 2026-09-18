import { AccountSection } from "../Account.tsx";
import { discoveryText } from "../copy.ts";
import { Link } from "../router.tsx";
import { useAppState } from "../store.tsx";

export function More() {
  const s = useAppState();
  return (
    <main className="app">
      <div className="stack">
        <section aria-labelledby="helps-heading" className="page-head">
          <h1 id="helps-heading" className="voice heading" style={{ marginBottom: 8 }}>
            What tends to help her
          </h1>
          {s.discoveries.length === 0 ? (
            <p className="meta">
              Nothing yet. After you've taken care of her, she can say whether it helped. When a pattern holds and she
              confirms it, it shows up here.
            </p>
          ) : (
            <ul className="list" style={{ marginTop: 12 }}>
              {s.discoveries.map((d) => {
                const t = discoveryText(d, "him");
                return (
                  <li key={d.id} className="discovery">
                    {t.lead}
                    {t.card && <span className="voice">“{t.card}”</span>}
                    {t.tail}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <nav aria-label="More">
          <ul className="list">
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
