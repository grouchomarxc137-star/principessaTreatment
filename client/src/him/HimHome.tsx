import { useState } from "react";
import { RESPONSE_KINDS, type AppState, type RequestView, type ResponseKind } from "../../../shared/types.ts";
import { api } from "../api.ts";
import { FEELING, RESPONSE_BUTTON, since, when } from "../copy.ts";
import { Link } from "../router.tsx";
import { useAppState, useStore } from "../store.tsx";
import { Card, CardTitle } from "../ui/Card.tsx";
import { TopBar } from "../ui/Chrome.tsx";
import { Mark } from "../ui/Mark.tsx";

const ORDER = { SOS: 0, HANDLE_ME: 1, CANT_ASK: 2, CARD: 3, OFFER: 3, MYSTERY: 4 } as const;

export function HimHome() {
  const s = useAppState();
  const waitingSos = s.active.find((r) => r.kind === "SOS" && !r.response);
  const requests = s.active.filter((r) => r !== waitingSos).sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  const dos = s.preferences.filter((p) => p.kind === "DO").map((p) => p.text);
  const donts = s.preferences.filter((p) => p.kind === "DONT").map((p) => p.text);

  return (
    <main className="app">
      <TopBar mode={s.mode} />

      <div className="stack">
        {waitingSos ? (
          <SosHero r={waitingSos} feeling={s.feeling ? FEELING[s.feeling].hers : null} />
        ) : (
          <section aria-label="How she is">
            <h1 className="voice status">{s.feeling ? FEELING[s.feeling].hers : "She hasn't said how she is."}</h1>
            {s.feeling && s.feelingSince && <p className="meta">{capitalize(since(s.feelingSince))}.</p>}
          </section>
        )}

        {requests.length > 0 && (
          <section aria-label="What she's asked for" className="stack">
            {requests.map((r) => (
              <RequestCard key={r.id} r={r} s={s} />
            ))}
          </section>
        )}

        {!waitingSos && requests.length === 0 && (
          <div className="empty">
            <p className="voice">She hasn't asked for anything.</p>
            <p className="meta">
              You could <Link to="/offer">put something on offer</Link> or <Link to="/mystery">draw one of her secret wishes</Link>.
            </p>
          </div>
        )}

        {(dos.length > 0 || donts.length > 0) && (
          <section aria-labelledby="treat-heading">
            <h2 id="treat-heading" className="voice heading" style={{ marginBottom: 12 }}>
              How she wants it right now
            </h2>
            <dl className="treat-list">
              {dos.length > 0 && (
                <>
                  <dt>Do</dt>
                  <dd>{dos.join(", ")}</dd>
                </>
              )}
              {donts.length > 0 && (
                <>
                  <dt>Don't</dt>
                  <dd>{donts.join(", ")}</dd>
                </>
              )}
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}

function useRespond(r: RequestView, chosenCardId?: string | null) {
  const { act, say } = useStore();
  return (kind: ResponseKind) =>
    act(() => api.post(`/requests/${r.id}/respond`, { kind, chosenCardId: chosenCardId ?? undefined })).then(
      (ok) => ok && say("She'll see your answer."),
    );
}

function SosHero({ r, feeling }: { r: RequestView; feeling: string | null }) {
  const respond = useRespond(r);
  return (
    <section className="alert-hero" aria-live="assertive">
      <h1 className="voice status">She needs you.</h1>
      <p className="lede" style={{ color: "var(--ink-soft)", marginTop: 8 }}>
        She pressed SOS at {when(r.createdAt)}. No details, just you.
        {feeling && ` Last she said: ${feeling.replace("She's", "she's").replace("She misses", "she misses")}`}
      </p>
      <div className="buttons" style={{ marginTop: 22 }}>
        <button type="button" className="btn btn--pearl" onClick={() => respond("ON_IT")}>
          {RESPONSE_BUTTON.ON_IT}
        </button>
        <button type="button" className="btn" onClick={() => respond("LITTLE_BIT")}>
          {RESPONSE_BUTTON.LITTLE_BIT}
        </button>
        <button type="button" className="btn" onClick={() => respond("CANT_NOW")}>
          {RESPONSE_BUTTON.CANT_NOW}
        </button>
      </div>
    </section>
  );
}

// Mode-appropriate cards, with the ones she's confirmed help put first.
function ideasFor(s: AppState) {
  const notes = new Map<string, { note: string; rank: number }>();
  for (const d of s.discoveries) {
    if (!d.card) continue;
    if (d.feeling && d.feeling === s.feeling) {
      notes.set(d.card.id, { note: `Helps when ${FEELING[d.feeling].hers.slice(0, -1).toLowerCase()}`, rank: 0 });
    } else if (!d.feeling && !notes.has(d.card.id)) {
      notes.set(d.card.id, { note: "Tends to help her", rank: 1 });
    }
  }
  return s.cards
    .filter((c) => (c.mode === "ANY" || c.mode === s.mode) && c.title !== "Choose for me")
    .map((c) => ({ card: c, note: notes.get(c.id)?.note ?? null, rank: notes.get(c.id)?.rank ?? 2 }))
    .sort((a, b) => a.rank - b.rank);
}

function RequestCard({ r, s }: { r: RequestView; s: AppState }) {
  const { act, say } = useStore();
  const [changing, setChanging] = useState(false);
  const [idea, setIdea] = useState<string | null>(r.response?.chosenCard?.id ?? null);
  const respond = useRespond(r, r.kind === "HANDLE_ME" ? idea : null);
  const answered = r.response && !changing;

  const markDone = () => act(() => api.post(`/requests/${r.id}/done`)).then((ok) => ok && say("Marked as done."));

  const actions = answered ? (
    <div style={{ marginTop: 16 }}>
      <p className="card__body">You said “{RESPONSE_BUTTON[r.response!.kind]}”.</p>
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn--small btn--primary" onClick={markDone}>
          Mark as done
        </button>
        <button type="button" className="textbtn" onClick={() => setChanging(true)}>
          Change answer
        </button>
      </div>
    </div>
  ) : (
    <div className="buttons">
      {RESPONSE_KINDS.map((kind, i) => (
        <button
          key={kind}
          type="button"
          className={`btn ${i === 0 ? "btn--primary" : ""}`}
          onClick={() => respond(kind).then(() => setChanging(false))}
        >
          {RESPONSE_BUTTON[kind]}
        </button>
      ))}
    </div>
  );

  if (r.kind === "CANT_ASK" && !r.card) {
    return (
      <Card className="card--request card--sealed" aria-label="She can't ask for anything right now">
        <span className="seal" aria-hidden="true">
          <Mark />
        </span>
        <p className="sealed-text">She could use some extra love right now. Don't ask, just be sweet.</p>
        <p className="card__note" style={{ marginTop: 10, maxWidth: "none" }}>
          Sent quietly at {when(r.createdAt)}. No need to mention it.
        </p>
        {actions}
      </Card>
    );
  }

  // From before "I can't ask for it" became a quiet signal: those carried a card.
  if (r.kind === "CANT_ASK") {
    return (
      <Card className="card--request card--sealed" aria-label="A request she couldn't ask for herself">
        <span className="seal" aria-hidden="true">
          <Mark />
        </span>
        <p className="sealed-text">
          She can't ask for this herself right now, but she'd really like {r.card?.forHim ?? "something from you"}.
        </p>
        <p className="card__note" style={{ marginTop: 10, maxWidth: "none" }}>
          Sent for her at {when(r.createdAt)}. No need to mention that she asked.
        </p>
        {actions}
      </Card>
    );
  }

  if (r.kind === "HANDLE_ME") {
    const ideas = ideasFor(s);
    return (
      <Card className="card--request">
        <CardTitle>She's handed it to you.</CardTitle>
        <p className="card__body">
          She doesn't want to decide. You choose how to take care of her. Pick an idea if it helps, or do your own
          thing.
        </p>
        {!answered && (
          <div className="ideas" role="group" aria-label="Ideas">
            {ideas.map(({ card, note }) => (
              <button
                key={card.id}
                type="button"
                className="idea"
                aria-pressed={idea === card.id}
                onClick={() => setIdea(idea === card.id ? null : card.id)}
              >
                {card.title}
                {note && <small>{note}</small>}
              </button>
            ))}
          </div>
        )}
        <p className="card__note" style={{ marginTop: 10 }}>
          Handed over at {when(r.createdAt)}.
        </p>
        {actions}
      </Card>
    );
  }

  const title = r.kind === "SOS" ? "She needs you." : r.kind === "OFFER" ? (r.offerText ?? "Your offer") : (r.card?.title ?? "Something from you");
  const note =
    r.kind === "SOS"
      ? `She pressed SOS at ${when(r.createdAt)}.`
      : r.kind === "OFFER"
        ? `She took you up on this at ${when(r.createdAt)}.`
        : `She asked at ${when(r.createdAt)}.`;

  return (
    <Card className="card--request" his={r.kind === "OFFER"}>
      <CardTitle>{title}</CardTitle>
      <p className="card__note">{note}</p>
      {actions}
    </Card>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
