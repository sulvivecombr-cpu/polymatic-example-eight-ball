import { type Server, type Socket } from "socket.io";
import { Middleware, Runtime } from "polymatic";

import { randomRoomId } from "../lobby/RoomId";
import { MainServer } from "../eight-ball-server/MainServer";
import { ServerBilliardContext } from "../eight-ball-server/ServerContext";
import { createCompetitiveMatch, cancelMatch, getMatchByRoom } from "../game/MatchManager";

export const lobby = (io: Server) => {
  Runtime.activate(new LobbyServer(), { io });
};

export class Room {
  id = randomRoomId();
  entryFee = 0;
  competitive = false;
}

interface LobbyContext {
  io: Server;
}

class LobbyServer extends Middleware<LobbyContext> {
  constructor() {
    super();
    this.on("activate", this.handleActivate);
  }

  handleActivate() {
    const io = this.context.io;

    io.on("connection", (socket) => {
      socket.on("create-room", (data, ack) => this.handleCreateRoomRequest(socket, data, ack));
      socket.on("check-room", (id, ack) => this.handleCheckRoomRequest(id, ack));
    });
  }

  handleCreateRoomRequest = async (socket: Socket, data: any, ack: any) => {
    // Support both old signature (ack only) and new (data, ack)
    if (typeof data === "function") {
      ack = data;
      data = {};
    }
    if (typeof ack !== "function") return;

    const room = new Room();
    const entryFee = typeof data?.entryFee === "number" ? Math.max(0, Math.floor(data.entryFee)) : 0;

    // Competitive rooms require authentication
    if (entryFee > 0) {
      const user = (socket as any).user;
      if (!user) {
        ack({ error: "Autenticação necessária para partidas competitivas" });
        return;
      }
      room.entryFee = entryFee;
      room.competitive = true;

      try {
        await createCompetitiveMatch(room.id, entryFee, user.userId);
      } catch (err: any) {
        ack({ error: err.message || "Erro ao criar partida competitiva" });
        return;
      }
    }

    this.activateRoom(room);
    ack({ id: room.id, entryFee: room.entryFee, competitive: room.competitive });
  };

  /** Whether a room is still running: its namespace is removed when it closes, see RoomServer. */
  handleCheckRoomRequest = (id: string, ack: (alive: boolean) => void) => {
    if (typeof ack !== "function") return;
    ack(typeof id === "string" && this.context.io._nsps.has("/room/" + id));
  };

  activateRoom = (room: Room) => {
    // create a socket.io namespace for each room
    const namespace = this.context.io.of("/room/" + room.id);

    // create and activate a server-side game instance
    const context = new ServerBilliardContext();
    context.room = room;
    context.io = namespace;
    Runtime.activate(new MainServer(), context);
  };
}
