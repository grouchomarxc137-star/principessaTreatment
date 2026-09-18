import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

export const env = {
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: required("DATABASE_URL"),
  principessaPassword: process.env.PRINCIPESSA_PASSWORD,
  principePassword: process.env.PRINCIPE_PASSWORD,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:principe@example.com",
  mediaDir: process.env.MEDIA_DIR ?? "media",
};
