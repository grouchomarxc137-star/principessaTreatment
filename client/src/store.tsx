import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AppState } from "../../shared/types.ts";
import { ApiError, api } from "./api.ts";

// One snapshot of everything, refetched whenever the server says something
// changed, when the app comes back to the foreground, and once a minute as a
// fallback.

interface Store {
  state: AppState | null;
  error: string | null;
  refresh: () => Promise<void>;
  // Runs a change, refreshes, and reports failures in the toast.
  act: <T>(run: () => Promise<T>) => Promise<T | undefined>;
  toast: string | null;
  say: (message: string) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children, onSignedOut }: { children: ReactNode; onSignedOut: () => void }) {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const say = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setState(await api.get<AppState>("/state"));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
      else setError((e as Error).message);
    }
  }, [onSignedOut]);

  const act = useCallback(
    async <T,>(run: () => Promise<T>) => {
      try {
        const result = await run();
        await refresh();
        return result;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) onSignedOut();
        else say((e as Error).message);
        await refresh();
        return undefined;
      }
    },
    [refresh, say, onSignedOut],
  );

  useEffect(() => {
    refresh();

    let pending: number | undefined;
    const soon = () => {
      window.clearTimeout(pending);
      pending = window.setTimeout(refresh, 120);
    };

    const events = new EventSource("/api/events");
    events.addEventListener("change", soon);

    const onVisible = () => document.visibilityState === "visible" && soon();
    document.addEventListener("visibilitychange", onVisible);
    const poll = window.setInterval(refresh, 60_000);

    return () => {
      events.close();
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
      window.clearTimeout(pending);
    };
  }, [refresh]);

  return (
    <StoreContext.Provider value={{ state, error, refresh, act, toast, say }}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore outside StoreProvider");
  return store;
}

// For screens that only render once state has loaded.
export function useAppState(): AppState {
  const { state } = useStore();
  if (!state) throw new Error("State not loaded yet");
  return state;
}
