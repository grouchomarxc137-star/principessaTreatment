import { useCallback, useEffect, useState } from "react";
import type { Me } from "../../shared/types.ts";
import { api } from "./api.ts";
import { HerApp } from "./her/HerApp.tsx";
import { HimApp } from "./him/HimApp.tsx";
import { SignIn } from "./SignIn.tsx";
import { StoreProvider, useStore } from "./store.tsx";
import { Mark } from "./ui/Mark.tsx";

export type Side = "her" | "him";

const THEME_COLOR = { her: "#fdf4e3", him: "#fdf4e3", sos: "#e9b40f" };

// Both sides are cream, and his turns gold while she's
// waiting on an SOS. Set on <html> so the whole page follows.
export function useSide(side: Side, alert = false) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.side = side;
    if (alert) root.dataset.alert = "sos";
    else delete root.dataset.alert;
    const color = alert ? THEME_COLOR.sos : THEME_COLOR[side];
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  }, [side, alert]);
}

export function App() {
  // undefined while we check the session, null when signed out.
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    api
      .get<Me>("/auth/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const signedOut = useCallback(() => setMe(null), []);

  if (me === undefined) return <Waiting />;
  if (me === null) return <SignIn onSignedIn={setMe} />;
  return (
    <StoreProvider onSignedOut={signedOut}>
      <Signed me={me} />
    </StoreProvider>
  );
}

function Signed({ me }: { me: Me }) {
  const { state, error, refresh } = useStore();
  const side: Side = me.role === "PRINCIPESSA" ? "her" : "him";
  // His screen turns gold from the moment she presses SOS until he answers it.
  const waitingSos = side === "him" && Boolean(state?.active.some((r) => r.kind === "SOS" && !r.response));
  useSide(side, waitingSos);

  if (!state) {
    if (!error) return <Waiting />;
    return (
      <main className="app">
        <div className="empty" style={{ marginTop: "20svh" }}>
          <p className="voice">Can't reach the app.</p>
          <p className="meta">{error}</p>
        </div>
        <button className="btn btn--primary" type="button" onClick={refresh}>
          Try again
        </button>
      </main>
    );
  }
  return side === "her" ? <HerApp /> : <HimApp />;
}

function Waiting() {
  return (
    <main className="app" aria-busy="true">
      <Mark className="signin__mark" title="Principessa Treatment" />
    </main>
  );
}
