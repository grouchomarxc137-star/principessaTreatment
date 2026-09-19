import { useState } from "react";
import { FEELINGS, HELPED, type Feeling, type Helped, type PreferenceView, type RequestView } from "../../../shared/types.ts";
import { api } from "../api.ts";
import { FEELING, RESPONSE_SEEN, requestTitle, since, when } from "../copy.ts";
import { Link } from "../router.tsx";
import { useAppState, useStore } from "../store.tsx";
import { Sheet, TopBar } from "../ui/Chrome.tsx";

export function HerHome() {
  const s = useAppState();
  const { act, say } = useStore();
  const [picking, setPicking] = useState(false);
  const [confirmingSos, setConfirmingSos] = useState(false);

  const sos = s.active.find((r) => r.kind === "SOS");
  const handedOver = s.active.find((r) => r.kind === "HANDLE_ME");
  const signalled = s.active.find((r) => r.kind === "CANT_ASK" && !r.card);
  const pending = s.aftercarePending[0];

  const sendSos = () => {
    setConfirmingSos(false);
    act(() => api.post("/sos")).then((r) => r && say(sos ? "He's been nudged again." : "Sent. He knows you need him."));
  };

  const handOver = () =>
    act(() => api.post("/handle-me")).then((r) => r && say("Handed over. He'll decide."));

  const signal = () =>
    act(() => api.post("/quiet")).then((r) => r && say("Sent quietly. He'll just be your Principe."));

  return (
    <main className="app">
      <TopBar mode={s.mode} />

      <div className="stack">
        <section aria-label="How you are">
          <button type="button" className="status-button" onClick={() => setPicking(true)} aria-haspopup="dialog">
            <h1 className="voice status">{s.feeling ? FEELING[s.feeling].mine : "How are you?"}</h1>
          </button>
          <p className="meta">
            {s.feeling && s.feelingSince ? `${capitalize(since(s.feelingSince))}. Tap to change.` : "Tap to tell him."}
          </p>
        </section>

        {s.active.length > 0 && (
          <section aria-label="What you've asked for">
            {s.active.map((r) => (
              <HerTicket key={r.id} r={r} />
            ))}
          </section>
        )}

        {pending && <AftercarePrompt key={pending.id} r={pending} />}

        <TreatSummary prefs={s.preferences.filter((p) => p.active)} />

        <nav className="ask-tiles" aria-label="Ways to ask">
          <Link to="/deck" className="ask-tile">
            <span className="voice">Pick a card</span>
            <span className="meta">Browse the deck</span>
          </Link>
          <button type="button" className="ask-tile" onClick={handOver} disabled={Boolean(handedOver)}>
            <span className="voice">You decide</span>
            <span className="meta">{handedOver ? "Handed to him" : "He chooses the care"}</span>
          </button>
          <button type="button" className="ask-tile" onClick={signal} disabled={Boolean(signalled)}>
            <span className="voice">I can't ask for it</span>
            <span className="meta">{signalled ? "He knows" : "He'll just be your Principe"}</span>
          </button>
        </nav>
      </div>

      <div className="sos-dock">
        <button type="button" className="sos" onClick={() => setConfirmingSos(true)} aria-haspopup="dialog">
          {sos ? "I still need you" : "I need you"}
        </button>
      </div>

      {picking && <FeelingSheet current={s.feeling} onClose={() => setPicking(false)} />}
      {confirmingSos && <SosSheet again={Boolean(sos)} onSend={sendSos} onClose={() => setConfirmingSos(false)} />}
    </main>
  );
}

function HerTicket({ r }: { r: RequestView }) {
  const { act } = useStore();
  const status = r.response ? RESPONSE_SEEN[r.response.kind] : "Sent to him.";
  const how =
    r.kind === "CANT_ASK" ? (r.card ? "Asked for you" : "Sent quietly") : r.kind === "OFFER" ? "You took his offer" : "Asked";

  return (
    <article className="ticket">
      <h2 className={`ticket__title ${r.kind === "OFFER" ? "ticket__title--his" : ""}`}>{requestTitle(r)}</h2>
      <p className="ticket__status">{status}</p>
      <p className="meta">
        {how} at {when(r.createdAt)}
      </p>
      <div className="row">
        <button type="button" className="textbtn" onClick={() => act(() => api.post(`/requests/${r.id}/done`))}>
          I'm okay now
        </button>
        {!r.response && (
          <button type="button" className="textbtn" onClick={() => act(() => api.post(`/requests/${r.id}/cancel`))}>
            Take it back
          </button>
        )}
      </div>
    </article>
  );
}

const HELPED_SHORT: Record<Helped, string> = { A_LOT: "A lot", A_LITTLE: "A little", NOT_REALLY: "Not really" };

export function AftercarePrompt({ r, onDone }: { r: RequestView; onDone?: () => void }) {
  const { act, say } = useStore();
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState("");
  const chosen = r.kind === "HANDLE_ME" ? r.response?.chosenCard : null;
  const mystery = r.kind === "MYSTERY";

  const answer = (helped: Helped) =>
    act(() => api.post(`/requests/${r.id}/aftercare`, { helped, note: note.trim() || undefined })).then((ok) => {
      if (ok) {
        say("Noted. Thank you.");
        onDone?.();
      }
    });

  return (
    <section className={`ticket ${mystery ? "ticket--reveal" : ""}`} aria-label="Did it help?">
      {mystery ? (
        <>
          <h2 className="voice subheading">He granted one of your wishes</h2>
          <p className="reveal-text">“{r.missionText}”</p>
          <p className="meta">He drew it in secret and did it, {when(r.createdAt)}. Did it help? He'll see your answer.</p>
        </>
      ) : (
        <>
          <h2 className="voice subheading">Did it help?</h2>
          <p className="meta">
            {requestTitle(r)}, {when(r.createdAt)}.{chosen && ` He went with “${chosen.title}”.`} He'll see your
            answer.
          </p>
        </>
      )}
      <div className="chips" style={{ marginTop: 12 }}>
        {HELPED.map((h) => (
          <button key={h} type="button" className="chip" onClick={() => answer(h)}>
            {HELPED_SHORT[h]}
          </button>
        ))}
      </div>
      {noting ? (
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor={`note-${r.id}`}>A few words, if you like. Then pick an answer above.</label>
          <input
            id={`note-${r.id}`}
            className="input"
            maxLength={280}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
        </div>
      ) : (
        <div className="row">
          <button type="button" className="textbtn" onClick={() => setNoting(true)}>
            Add a note
          </button>
          {!onDone && (
            <button
              type="button"
              className="textbtn"
              onClick={() => act(() => api.post(`/requests/${r.id}/aftercare/skip`))}
            >
              Not now
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function TreatSummary({ prefs }: { prefs: PreferenceView[] }) {
  const dos = prefs.filter((p) => p.kind === "DO").map((p) => lower(p.text));
  const donts = prefs.filter((p) => p.kind === "DONT").map((p) => lower(p.text));
  if (!dos.length && !donts.length) {
    return (
      <Link to="/me" className="textbtn">
        Tell him how to treat you right now
      </Link>
    );
  }
  return (
    <Link to="/me" className="treat-summary" aria-label="How to treat me right now. Tap to change.">
      <dl>
        {dos.length > 0 && (
          <>
            <dt>Do:</dt> <dd>{dos.join(", ")}.</dd>{" "}
          </>
        )}
        {donts.length > 0 && (
          <>
            <dt>Don't:</dt> <dd>{donts.join(", ")}.</dd>
          </>
        )}
      </dl>
    </Link>
  );
}

// One more tap to be sure, with the button where her thumb already is.
function SosSheet({ again, onSend, onClose }: { again: boolean; onSend: () => void; onClose: () => void }) {
  return (
    <Sheet label={again ? "Tell him again?" : "Tell him you need him?"} onClose={onClose}>
      <h2 className="voice heading">{again ? "Tell him again?" : "Tell him you need him?"}</h2>
      <p className="meta">
        {again ? "He'll get another nudge right away." : "He'll know right away. You don't have to explain anything."}
      </p>
      <div className="buttons" style={{ marginTop: 28 }}>
        <button type="button" className="textbtn" style={{ justifySelf: "center" }} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="sos" onClick={onSend}>
          {again ? "Yes, I still need you" : "Yes, I need you"}
        </button>
      </div>
    </Sheet>
  );
}

function FeelingSheet({ current, onClose }: { current: Feeling | null; onClose: () => void }) {
  const { act } = useStore();
  const choose = (feeling: Feeling | null) => {
    onClose();
    act(() => api.post("/her/feeling", { feeling }));
  };
  return (
    <Sheet label="How are you?" onClose={onClose}>
      <h2 className="voice heading">How are you?</h2>
      <p className="meta">He'll see this on his phone.</p>
      <div className="feeling-options">
        {FEELINGS.map((f) => (
          <button key={f} type="button" aria-pressed={f === current} onClick={() => choose(f)}>
            {FEELING[f].mine}
          </button>
        ))}
      </div>
      {current && (
        <button type="button" className="textbtn" onClick={() => choose(null)}>
          Clear it
        </button>
      )}
    </Sheet>
  );
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
