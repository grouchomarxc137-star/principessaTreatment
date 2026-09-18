import { useEffect, useRef, type ReactNode } from "react";
import type { Mode } from "../../../shared/types.ts";
import { api } from "../api.ts";
import { MODE_NAME } from "../copy.ts";
import { Link, useRouter } from "../router.tsx";
import { useStore } from "../store.tsx";
import { Mark } from "./Mark.tsx";

export interface Tab {
  to: string;
  label: string;
  dot?: boolean;
}

export function TabBar({ tabs }: { tabs: Tab[] }) {
  const { path } = useRouter();
  const current = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  return (
    <nav className="tabbar" aria-label="Main">
      <ul>
        {tabs.map((tab) => (
          <li key={tab.to}>
            <Link to={tab.to} aria-current={current(tab.to) ? "page" : undefined}>
              {tab.label}
              {tab.dot && <span className="dot" aria-label="(new)" />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ModeSwitch({ mode }: { mode: Mode }) {
  const { act, say } = useStore();
  const set = (next: Mode) => {
    if (next === mode) return;
    act(() => api.post("/mode", { mode: next })).then(() => say(`${MODE_NAME[next]} mode is on.`));
  };
  return (
    <div className="segmented" role="group" aria-label="Where you are">
      {(["DISTANCE", "TOGETHER"] as const).map((m) => (
        <button key={m} type="button" aria-pressed={m === mode} onClick={() => set(m)}>
          {MODE_NAME[m]}
        </button>
      ))}
    </div>
  );
}

export function TopBar({ mode }: { mode: Mode }) {
  return (
    <header className="topbar">
      <Mark className="topbar__mark" title="Principessa Treatment" />
      <ModeSwitch mode={mode} />
    </header>
  );
}

export function BackBar({ to, label }: { to: string; label: string }) {
  return (
    <header className="topbar">
      <Link to={to} className="back">
        {label}
      </Link>
    </header>
  );
}

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>
        {children}
      </div>
    </>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      {toast}
    </div>
  );
}
