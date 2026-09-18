import type { Request, Response } from "express";

// Live updates over Server-Sent Events. The server only says "something
// changed"; each app then refetches its own view of the state, so nothing
// private ever travels over this channel.

const clients = new Set<Response>();

export function openStream(req: Request, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 3000\n\n");
  clients.add(res);

  // Keeps proxies from closing an idle connection.
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
}

export function broadcastChange() {
  for (const res of clients) res.write("event: change\ndata: {}\n\n");
}
