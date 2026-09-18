import webpush from "web-push";
import type { Role } from "../../shared/types.ts";
import { prisma } from "./db.ts";
import { env } from "./env.ts";

// Push notifications to installed apps. Without VAPID keys this quietly does
// nothing and the apps still update live while open.

export const pushConfigured = Boolean(env.vapidPublicKey && env.vapidPrivateKey);

if (pushConfigured) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey!, env.vapidPrivateKey!);
}

export interface PushMessage {
  title: string;
  body: string;
  // Where tapping the notification opens the app.
  url?: string;
  // Notifications with the same tag replace each other instead of piling up.
  tag?: string;
  urgent?: boolean;
}

export async function notify(to: Role, message: PushMessage) {
  if (!pushConfigured) return;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { user: { role: to } } });
  const payload = JSON.stringify({ url: "/", ...message });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: message.urgent ? 60 * 60 : 12 * 60 * 60, urgency: message.urgent ? "high" : "normal" },
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // The browser threw this subscription away; forget it too.
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.warn("Push failed", status ?? error);
        }
      }
    }),
  );
}

// Fire-and-forget from request handlers: a slow push service must never
// hold up the person pressing the button.
export function notifyLater(to: Role, message: PushMessage) {
  notify(to, message).catch((error) => console.warn("Push failed", error));
}
