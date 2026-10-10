# Base44 Setup Notes

## What this is
Multiplayer 8-ball pool game (Polymatic + Socket.io + Planck physics + Pixi.js rendering).
Single Express server serves both the Vite dev frontend and the Socket.io backend on one port.

## Running in the sandbox
- `docker-compose.base44.yml` uses `node:22`, bind-mounts the source, runs `npm install && npm run dev` (tsx watch).
- The app listens on port 3000 (`PORT=3000`).
- `BROWSER=none` prevents the server from trying to open a browser on startup.
- No database, no external services, no secrets required.
- Vite host allowlisting is handled by `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` (set by the platform).

## Healthcheck
`fetch('http://localhost:3000/')` — returns 200 with the HTML page once the dev server is ready.

## Notes
- npm install takes ~60-90s on first boot; the healthcheck has a 40s start_period.
- The app auto-starts a "Play Computer" game on load.
- Game state is in-memory only; server restart loses all games.
