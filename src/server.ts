import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import ViteExpress from "vite-express";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import { lobby } from "./lobby-server/LobbyServer";

// `npm start` passes --production: serve the built client from dist, rather than running vite
const production = process.argv.includes("--production") || process.env.NODE_ENV === "production";
if (production) process.env.NODE_ENV = "production";
// vite-express mounts on the base, which vite.config.ts leaves relative for static hosting
ViteExpress.config({ mode: production ? "production" : "development", inlineViteConfig: { base: "/" } });

const PORT = Number(process.env.PORT) || 4801;

// create express app
const expressApp = express();

// middleware
expressApp.use(express.json());
expressApp.use(cookieParser());

// create http server
const httpServer = http.createServer(expressApp);

// ============ API ROUTES ============
import { expressAuth } from "./auth/middleware";
import authRoutes from "./api/auth";
import profileRoutes from "./api/profile";
import walletRoutes from "./api/wallet";
import leaderboardRoutes from "./api/leaderboard";
import adminRoutes from "./api/admin";

expressApp.use(expressAuth);
expressApp.use("/api/auth", authRoutes);
expressApp.use("/api/profile", profileRoutes);
expressApp.use("/api/wallet", walletRoutes);
expressApp.use("/api/leaderboard", leaderboardRoutes);
expressApp.use("/api/admin", adminRoutes);

// serves socket.io admin-ui
expressApp.use(
  "/admin/socket.io",
  express.static(path.join(import.meta.dirname, "../node_modules/@socket.io/admin-ui/ui/dist")),
);

// serve client app
ViteExpress.bind(expressApp, httpServer);

// start http server
httpServer.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server running on ${url}`);
  if (!production) openBrowser(url);
});

// create socket.io server
const io = new Server(httpServer);

// socket.io auth middleware
import { socketAuth } from "./auth/middleware";
io.use(socketAuth);

// match-making lobby
lobby(io);

// add socket.io admin ui
instrument(io, {
  auth: false,
  mode: "development",
});

/**
 * Opens the page when `npm run dev` starts. tsx watch restarts this server on every change while the page stays open,
 * so it is opened once per watcher, which outlives the restarts: a file named after it says the page was opened.
 * BROWSER=none leaves it to you, as in vite.
 */
function openBrowser(url: string) {
  if (process.env.BROWSER === "none") return;
  const opened = path.join(os.tmpdir(), `polymatic-example-eight-ball-${process.ppid}.opened`);
  if (fs.existsSync(opened)) return;
  fs.writeFileSync(opened, url);
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? 'start ""' : "xdg-open";
  exec(`${command} ${url}`);
}
