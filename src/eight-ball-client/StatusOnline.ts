import { Memo, Middleware } from "polymatic";

import { type ClientBilliardContext } from "./ClientContext";

/** Publishes the online game's status line onto the hud - see HudData. */
export class StatusOnline extends Middleware<ClientBilliardContext> {
  memo = Memo.init();

  constructor() {
    super();
    this.on("deactivate", this.handleDeactivate);
    this.on("frame-loop", this.handleFrameLoop);
  }

  handleDeactivate = () => {
    this.memo.clear();
    this.context.hud.statusText.value = "";
  };

  handleFrameLoop = () => {
    const context = this.context;
    const player = context.player;
    if (
      this.memo.update(
        player?.color,
        player?.turn,
        context.turn?.current,
        context.players?.length,
        context.shotInProgress,
        context.room,
      )
    ) {
      const status = [];
      if (context.gameOver) {
        if (context.winner) {
          if (context.winner === context.player.id) {
            status.push("Você venceu");
          } else {
            status.push("Você perdeu");
          }
        } else {
          status.push("Fim de jogo");
        }
      } else {
        if (player?.color) {
          status.push("Jogando " + (player.color === "stripe" ? "listradas" : "lisas"));
        }
        if (!context.players || context.players.length < 2) {
          status.push("Aguardando oponente");
        } else if (context.shotInProgress) {
          status.push("Tacada em andamento");
        } else if (context.turn?.current && player?.turn) {
          status.push(context.turn?.current === player?.turn ? "Sua vez" : "Vez do oponente");
        }
      }
      context.hud.statusText.value = status.join(" | ");
    }
  };
}
