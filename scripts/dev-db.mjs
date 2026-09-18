// Local development Postgres, no system install needed.
// Runs a real PostgreSQL server from node_modules, keeps its data in ./.pgdata,
// and applies any pending migrations. `npm run dev` starts it for you; you can
// also run it on its own with `npm run db`.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

const PORT = 5433;
const DB = "principessa";
const DATABASE_URL = `postgresql://postgres:postgres@localhost:${PORT}/${DB}`;
const dataDir = fileURLToPath(new URL("../.pgdata", import.meta.url));
const root = fileURLToPath(new URL("..", import.meta.url));

const say = (message) => console.log(message);

function portInUse() {
  return new Promise((resolve) => {
    const socket = connect(PORT, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function ensureDatabase() {
  const client = new pg.Client({ connectionString: `postgresql://postgres:postgres@localhost:${PORT}/postgres` });
  await client.connect();
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB]);
  if (!rowCount) await client.query(`CREATE DATABASE ${DB}`);
  await client.end();
}

function migrate() {
  say("Applying migrations…");
  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      cwd: root,
      env: { ...process.env, DATABASE_URL, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
      stdio: "pipe",
    });
  } catch (error) {
    // Only show Prisma's output when something went wrong.
    process.stderr.write(error.stdout ?? "");
    process.stderr.write(error.stderr ?? "");
    throw error;
  }
}

// Stopped by Ctrl+C or by `npm run dev` shutting down: leave quietly.
let stopping = false;
const quit = () => {
  stopping = true;
  process.exit(0);
};
process.on("SIGINT", quit);
process.on("SIGTERM", quit);

// Already running (`npm run db` in another terminal)? Use it.
if (await portInUse()) {
  try {
    await ensureDatabase();
  } catch {
    say(`Something else is using port ${PORT} and it isn't this app's database.`);
    say(`Find it with:  lsof -i :${PORT}   then stop it and try again.`);
    process.exit(1);
  }
  migrate();
  say(`The database is already running on port ${PORT}; using it.`);
  process.exit(0);
}

const server = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
  onLog: () => {},
});

try {
  if (!existsSync(dataDir)) {
    say("First run: creating the local database in .pgdata/");
    await server.initialise();
  }
  await server.start();
  await ensureDatabase();
  migrate();
} catch (error) {
  if (stopping) process.exit(0);
  say("The local database couldn't start.");
  if (error) console.error(error);
  say("If it says a lock file already exists, another copy is still running: close the other terminal running");
  say("`npm run dev` or `npm run db` and try again.");
  process.exit(1);
}

say(`Ready on port ${PORT}.`);

const stop = async () => {
  if (stopping) return;
  stopping = true;
  say("Stopping the database…");
  await server.stop().catch(() => {});
  process.exit(0);
};
process.removeListener("SIGINT", quit);
process.removeListener("SIGTERM", quit);
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
