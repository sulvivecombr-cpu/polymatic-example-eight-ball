import { Middleware } from "polymatic";

import { type ServerBilliardContext, type Auth } from "./ServerContext";
import { joinCompetitiveMatch, startMatch, settleMatch, cancelMatch } from "../game/MatchManager";

/**
 * This runs on server and is responsible for sending data to clients, and receiving user actions from clients.
 */
export class RoomServer extends Middleware<ServerBilliardContext> {
  inactiveRoomTimeout: any;
  competitiveJoined = new Set<string>(); // database user IDs that have joined competitively
  // Maps game auth ID → database user ID for competitive settlement
  authIdToUserId = new Map<string, string>();

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
    this.on("frame-loop", this.handleFrameLoop);

    this.on("update", this.sendFixedObjects);

    this.on("user-enter", this.handleUserEnter);
    this.on("user-exit", this.handleUserExit);
    this.on("game-start", this.handleGameStart);
    this.on("game-over", this.handleGameOver);
  }

  handleActivate() {
    this.extendRoomLease();

    this.context.io.on("connection", (socket) => {
      const auth = { ...socket.handshake.auth } as Auth;
      const room = this.context.room;

      if (!room || !auth) return;

      let record = this.context.auths.find((p) => p.id === auth.id);

      if (!record) {
        record = { id: auth.id, secret: auth.secret };
        this.context.auths.push(record);
      } else if (record.secret !== auth.secret) {
        return;
      }

      let player = this.context.players.find((p) => p.id === auth.id);
      if (!player) {
        player = { id: auth.id };
        this.context.players.push(player);
      }

      // Competitive match: map auth ID to DB user ID, reserve tokens on join
      const user = (socket as any).user;
      if (user?.userId) {
        this.authIdToUserId.set(auth.id, user.userId);
      }

      if (room.competitive && room.entryFee > 0 && user && !this.competitiveJoined.has(user.userId)) {
        this.competitiveJoined.add(user.userId);
        joinCompetitiveMatch(room.id, user.userId).catch((err) => {
          console.error("Competitive join failed:", err.message);
          socket.emit("match-error", { error: err.message || "Erro ao entrar na partida" });
        });
      }

      this.emit("user-enter", { player });

      socket.on("cue-shot", (data) => {
        if (this.context.turn.current !== player.turn) return;
        this.emit("cue-shot", data);
        this.extendRoomLease();
      });

      this.sendFixedObjects();

      socket.on("exit-room", () => {
        this.context.players = this.context.players.filter((p) => p.id !== player.id);
        this.emit("user-exit", { player });
      });

      socket.on("disconnect", () => {
        this.emit("user-exit", { player });
      });
    });
  }

  handleDeactivate = () => {
    clearTimeout(this.inactiveRoomTimeout);

    // Cancel any competitive match when room closes
    if (this.context.room?.competitive) {
      cancelMatch(this.context.room.id, "Sala fechada").catch(() => {});
    }

    const io = this.context.io;
    if (io) {
      this.context.io = null;
      io.removeAllListeners("connection");
      io.local.disconnectSockets();
      io.server._nsps.delete(io.name);
    }
  };

  extendRoomLease = () => {
    clearTimeout(this.inactiveRoomTimeout);
    this.inactiveRoomTimeout = setTimeout(this.expireRoomLease, 30 * 60 * 1000);
  };

  expireRoomLease = () => {
    this.emit("terminate-room");
  };

  handleFrameLoop() {
    if (this.context.shotInProgress) {
      this.sendMovingObjects();
    }
  }

  sendMovingObjects = () => {
    const { balls, shotInProgress, gameOver, gameStarted, turn, winner } = this.context;
    this.context.io.emit("room-update", {
      balls,
      gameStarted,
      shotInProgress,
      gameOver,
      turn,
      winner,
    });
  };

  sendFixedObjects = () => {
    const { rails, pockets, table, players } = this.context;
    this.context.io.emit("room-update", {
      players,
      rails,
      pockets,
      table,
    });
    this.sendMovingObjects();
  };

  handleUserEnter = () => {
    const playersJoined = this.context.players.length === this.context.turn.turns.length;
    const notStarted = !this.context.gameStarted;
    if (playersJoined && notStarted) {
      this.context.gameStarted = true;
      this.emit("game-start");
    }
  };

  handleGameStart = () => {
    if (this.context.room?.competitive) {
      startMatch(this.context.room.id).catch(() => {});
    }
  };

  handleGameOver = () => {
    if (this.context.room?.competitive && this.context.winner) {
      // Convert game auth ID to database user ID for settlement
      const dbUserId = this.authIdToUserId.get(this.context.winner) || null;
      settleMatch(this.context.room.id, dbUserId).catch((err) => {
        console.error("Settlement failed:", err);
      });
    }
  };

  handleUserExit = () => {
    // If a player leaves during a competitive match, the other player wins by default
    if (this.context.room?.competitive && this.context.gameStarted && !this.context.gameOver) {
      const remainingPlayers = this.context.players;
      if (remainingPlayers.length === 1 && this.context.winner === undefined) {
        this.context.winner = remainingPlayers[0].id;
        this.context.gameOver = true;
        this.emit("game-over");
      }
    }
  };
}
