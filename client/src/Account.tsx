import { useEffect, useState } from "react";
import { api } from "./api.ts";
import { useAppState, useStore } from "./store.tsx";

type PushStatus = "checking" | "unsupported" | "install-first" | "dev" | "off" | "on" | "blocked";

const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isInstalled =
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function usePush() {
  const [status, setStatus] = useState<PushStatus>("checking");

  useEffect(() => {
    if (!import.meta.env.PROD) return setStatus("dev");
    if (isIos && !isInstalled) return setStatus("install-first");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setStatus("unsupported");
    if (Notification.permission === "denied") return setStatus("blocked");
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "off"));
  }, []);

  const enable = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setStatus(permission === "denied" ? "blocked" : "off");
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api.get<{ key: string }>("/push/key");
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
    await api.post("/push/subscribe", sub.toJSON());
    setStatus("on");
  };

  const disable = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.post("/push/unsubscribe", { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setStatus("off");
  };

  return { status, enable, disable };
}

const PUSH_NOTE: Partial<Record<PushStatus, string>> = {
  unsupported: "This browser can't show notifications from the app.",
  "install-first": "On iPhone, add the app to your Home Screen first (Share, then Add to Home Screen), then turn notifications on here.",
  dev: "Notifications work in the installed app, not in development.",
  blocked: "Notifications are blocked for this app. Allow them in your phone's settings, then come back here.",
};

export function AccountSection() {
  const s = useAppState();
  const { say } = useStore();
  const push = usePush();
  const isHer = s.me.role === "PRINCIPESSA";

  const signOut = async () => {
    await api.post("/auth/logout").catch(() => {});
    window.location.href = "/";
  };

  const run = (fn: () => Promise<void>, done: string) =>
    fn()
      .then(() => say(done))
      .catch((e: Error) => say(e.message || "That didn't work. Try again."));

  return (
    <section aria-labelledby="phone-heading">
      <h2 id="phone-heading" className="voice heading" style={{ marginBottom: 6 }}>
        This phone
      </h2>
      <p className="meta" style={{ marginBottom: 12 }}>
        {isHer
          ? "Get a notification when he answers, and when a secret mission of his is revealed."
          : "Get a notification the moment she presses SOS or asks for something."}
      </p>
      {!s.pushConfigured ? (
        <p className="meta">Notifications aren't set up on the server yet.</p>
      ) : PUSH_NOTE[push.status] ? (
        <p className="meta">{PUSH_NOTE[push.status]}</p>
      ) : push.status === "on" ? (
        <button type="button" className="btn btn--small" onClick={() => run(push.disable, "Notifications are off.")}>
          Turn off notifications
        </button>
      ) : push.status === "off" ? (
        <button type="button" className="btn btn--small btn--primary" onClick={() => run(push.enable, "Notifications are on.")}>
          Turn on notifications
        </button>
      ) : null}

      <div style={{ marginTop: 20 }}>
        <button type="button" className="textbtn" onClick={signOut}>
          Sign out of {s.me.name}
        </button>
      </div>
    </section>
  );
}
