// Runs before `npm run dev`: if the app is already running somewhere, say so
// plainly instead of letting three processes fail with port errors.
import { connect } from "node:net";

const inUse = (port) =>
  new Promise((resolve) => {
    const socket = connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });

const busy = [];
for (const [port, what] of [
  [5173, "the app"],
  [3001, "the API"],
]) {
  if (await inUse(port)) busy.push(`${what} (port ${port})`);
}

if (busy.length) {
  console.error(`
Principessa Treatment already seems to be running: ${busy.join(" and ")} ${busy.length > 1 ? "are" : "is"} in use.

  Open http://localhost:5173 to use the one that's running, or
  stop it with Ctrl+C in the terminal where you started it, then run npm run dev again.

If you can't find that terminal:  lsof -i :5173 -i :3001   shows what's using the ports.
`);
  process.exit(1);
}
