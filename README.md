# Principessa Treatment

A private, installable phone app for two people. Principessa tells Principe what she needs without having to explain herself; Principe sees it and answers.

The product and design decisions are in [docs/PLAN.md](docs/PLAN.md).

## Stack

- **App:** React 19, TypeScript, Vite. A PWA that installs to the home screen on iPhone and Android.
- **API:** Node, Express 5, TypeScript, Zod.
- **Database:** PostgreSQL through Prisma 7.
- **Live updates:** Server-Sent Events. Web Push when VAPID keys are set.
- **Hosting:** one Railway service (the API also serves the built app) plus a Railway Postgres database.

```
client/    the app (React). Screens live in her/ and him/.
server/    the API (Express). Routes in server/src/routes.
shared/    types used by both.
prisma/    schema and migrations.
scripts/   dev-db.mjs: a local Postgres with no system install.
```

## Run it locally

You need Node 22 or newer. Every command below runs **inside the project folder**, so start with:

```bash
cd ~/principessaTreatement
```

The first time only, install and create your settings file:

```bash
npm install
```

```bash
cp .env.example .env
```

Then, every time:

```bash
npm run dev
```

That one command starts the local database (its data lives in `.pgdata/`), applies any database changes, and runs the API and the app. Leave it running and open http://localhost:5173. Sign in as either person with the passwords in `.env` (`change-me` and `change-me-too` until you change them). Press Ctrl+C in that terminal to stop everything.

To try both sides at once, use a second browser or a private window for the other person. To use it from your phone on the same Wi-Fi, open the "Network" address the app prints.

### If something goes wrong

| You see | What it means |
| --- | --- |
| `ENOENT … /Users/melek/package.json` | You're not in the project folder. Run `cd ~/principessaTreatement` first. |
| "Principessa Treatment already seems to be running" | It's already running in another terminal. Use that one, or stop it with Ctrl+C there. |
| `lock file "postmaster.pid" already exists` | Another copy of the database is still running. Close the other terminal running `npm run dev`. |
| "Waiting for the database…" and then nothing | The database didn't start. Stop with Ctrl+C and run `npm run dev` again; the `[db]` lines say why. |

## Deploy to Railway

1. Push this folder to a GitHub repository.
2. In Railway, create a project from that repository.
3. Add a **PostgreSQL** database to the project.
4. On the app service, set these variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `NODE_ENV` = `production`
   - `PRINCIPESSA_PASSWORD` and `PRINCIPE_PASSWORD`: long passwords
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` for notifications (see below)
5. Generate a public domain for the service under Settings → Networking.

`railway.json` already tells Railway how to build (`npm run build`), to run database migrations before each deploy, to start with `npm start`, and to health-check `/api/health`.

On first start the server creates both accounts from the password variables and fills in the starting deck and Do/Don't list. Changing a password variable and redeploying updates that password and signs that person out on every device.

## Install on a phone

- **iPhone:** open the site in Safari, tap Share, then Add to Home Screen. Open it from the home screen from then on.
- **Android:** open it in Chrome and accept the install prompt, or use the menu's Install app.

## Notifications

Push is optional; without it the app still updates live while it's open. To turn it on:

```bash
npm run vapid
```

Put the two printed keys in `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, set `VAPID_SUBJECT` to a `mailto:` address, and redeploy. Then each person opens Me (her) or More (him) → This phone → Turn on notifications. On iPhone this only works in the installed app, iOS 16.4 or later.

What sends a notification:

- To him: SOS, a card, "I can't ask for it", "You decide", an offer taken.
- To her: each of his answers, and when he finishes a mystery mission.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Database on :5433, API on :3001, app on :5173, reloading on change |
| `npm run db` | Only the local database (already part of `npm run dev`) |
| `npm run migrate` | After editing `prisma/schema.prisma`: create a new migration and apply it |
| `npm run typecheck` | Type-check the server and the app |
| `npm run build` | Production build of both |
| `npm start` | Run the production build |
| `npm run vapid` | Make a key pair for push notifications |
