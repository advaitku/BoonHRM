// Custom Next.js server entry point for Plesk / Phusion Passenger.
//
// Passenger sets the port via the environment and expects the app to listen on
// it. This boots Next in production mode against the regular `.next` build.
// (For a fully self-contained deploy you can instead point Passenger's startup
// file at `.next/standalone/server.js` — decided at deployment time, M9.)
const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOST || "0.0.0.0";

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
    // eslint-disable-next-line no-console
    console.log(`BoonHRM ready on http://${hostname}:${port}`);
  });
});
