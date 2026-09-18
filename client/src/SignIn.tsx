import { useState, type FormEvent } from "react";
import type { Me, Role } from "../../shared/types.ts";
import { api } from "./api.ts";
import { useSide } from "./App.tsx";
import { useRouter } from "./router.tsx";
import { Mark } from "./ui/Mark.tsx";

export function SignIn({ onSignedIn }: { onSignedIn: (me: Me) => void }) {
  const [who, setWho] = useState<Role>("PRINCIPESSA");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { navigate } = useRouter();
  useSide(who === "PRINCIPE" ? "him" : "her");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await api.post<Me>("/auth/login", { who, password });
      navigate("/", { replace: true });
      onSignedIn(me);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="app signin">
      <Mark className="signin__mark" />
      <h1 className="voice signin__name">
        Principessa
        <br />
        Treatment
      </h1>

      <form className="signin__form" onSubmit={submit}>
        <div className="who" role="group" aria-label="Who's signing in">
          <button type="button" aria-pressed={who === "PRINCIPESSA"} onClick={() => setWho("PRINCIPESSA")}>
            Principessa
          </button>
          <button type="button" aria-pressed={who === "PRINCIPE"} onClick={() => setWho("PRINCIPE")}>
            Principe
          </button>
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--block btn--primary" type="submit" disabled={busy || !password}>
          Sign in
        </button>
      </form>
    </main>
  );
}
