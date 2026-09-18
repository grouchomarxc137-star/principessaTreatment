import { useEffect, useState } from "react";
import type { RequestView } from "../../shared/types.ts";
import { api } from "./api.ts";
import { HELPED_LABEL, RESPONSE_BUTTON, requestTitle, when } from "./copy.ts";
import { AftercarePrompt } from "./her/HerHome.tsx";
import { useAppState } from "./store.tsx";
import { BackBar } from "./ui/Chrome.tsx";

const STATUS = { OPEN: "Still open", DONE: "Done", CANCELLED: "Taken back" } as const;

export function History({ back }: { back: string }) {
  const s = useAppState();
  const isHer = s.me.role === "PRINCIPESSA";
  const [rows, setRows] = useState<RequestView[] | null>(null);
  const [rating, setRating] = useState<string | null>(null);

  const load = () => api.get<RequestView[]>("/history").then(setRows);
  useEffect(() => {
    load();
  }, [s]);

  return (
    <main className="app">
      <BackBar to={back} label={isHer ? "Me" : "More"} />
      <h1 className="voice heading" style={{ marginBottom: 16 }}>
        History
      </h1>
      {!rows ? (
        <p className="meta">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="empty">
          <p className="voice">Nothing yet.</p>
          <p className="meta">Every time she asks for something, it's kept here.</p>
        </div>
      ) : (
        <ul className="list">
          {rows.map((r) => (
            <li key={r.id}>
              <p className="voice subheading">{requestTitle(r, isHer ? "her" : "him")}</p>
              {r.missionText && <p className="reveal-text">“{r.missionText}”</p>}
              <p className="meta">
                {capitalize(when(r.createdAt))}. {STATUS[r.status]}.
                {r.response && ` ${isHer ? "He" : "You"} said “${RESPONSE_BUTTON[r.response.kind]}”.`}
              </p>
              {r.aftercare && (
                <p style={{ marginTop: 4 }}>
                  {isHer ? "" : "She said: "}
                  {isHer ? HELPED_LABEL[r.aftercare.helped] : HELPED_LABEL[r.aftercare.helped].toLowerCase()}
                  {r.aftercare.note && `. “${r.aftercare.note}”`}
                </p>
              )}
              {isHer && !r.aftercare && r.status === "DONE" && (
                <>
                  {rating === r.id ? (
                    <div style={{ marginTop: 10 }}>
                      <AftercarePrompt r={r} onDone={() => setRating(null)} />
                    </div>
                  ) : (
                    <button type="button" className="textbtn" onClick={() => setRating(r.id)}>
                      Say whether it helped
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
