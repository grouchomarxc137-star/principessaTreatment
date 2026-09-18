import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { loadSession } from "./auth.ts";
import { bootstrap } from "./bootstrap.ts";
import { prisma } from "./db.ts";
import { env } from "./env.ts";
import { HttpError } from "./http.ts";
import { authRoutes } from "./routes/auth.ts";
import { careRoutes } from "./routes/care.ts";
import { commonRoutes } from "./routes/common.ts";
import { principeRoutes } from "./routes/principe.ts";
import { principessaRoutes } from "./routes/principessa.ts";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  if (env.isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
        "font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
  }
  next();
};

// Changes must come from this app's own pages.
const sameOrigin: RequestHandler = (req, _res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  const origin = req.headers.origin;
  // Behind Railway's proxy the public host may arrive as X-Forwarded-Host.
  const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0].trim() ?? req.headers.host;
  if (origin && new URL(origin).host !== host) {
    return next(new HttpError(403, "Requests must come from the app itself."));
  }
  next();
};

const requireSession: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, "Sign in first."));
  next();
};

app.use(securityHeaders);

const api = express.Router();
// For Railway's health check: the server is up and can reach the database.
api.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});
api.use(express.json({ limit: "20kb" }));
api.use(sameOrigin);
api.use(loadSession);
api.use("/auth", authRoutes);
api.use(requireSession);
api.use(commonRoutes);
api.use(careRoutes);
api.use("/her", principessaRoutes);
api.use("/him", principeRoutes);
api.use((_req, _res, next) => next(new HttpError(404, "No such endpoint.")));
app.use("/api", api);

// The built app, with the API above taking priority.
const clientDist = fileURLToPath(new URL("../../client/dist", import.meta.url));
if (existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders(res, path) {
        if (path.includes("/assets/")) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        else res.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
  app.get("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile("index.html", { root: clientDist });
  });
}

const onError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if ((error as { code?: string }).code === "P2025") {
    res.status(404).json({ error: "That no longer exists." });
    return;
  }
  if ((error as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "The request body isn't valid JSON." });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server. Try again in a moment." });
};
app.use(onError);

// The database may still be starting (in development `npm run dev` starts both
// at once), so give it a little while before giving up.
for (let attempt = 1; ; attempt++) {
  try {
    await bootstrap();
    break;
  } catch (error) {
    if (attempt === 30) {
      console.error("Couldn't reach the database. Is it running? Locally, `npm run dev` starts it.");
      throw error;
    }
    if (attempt === 1) console.log("Waiting for the database…");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

const server = app.listen(env.port, () => {
  console.log(`Principessa Treatment listening on :${env.port}`);
});
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${env.port} is already in use. Is the app already running in another terminal?`);
    process.exit(1);
  }
  throw error;
});
