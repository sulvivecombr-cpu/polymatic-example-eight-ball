import { Memo, Middleware } from "polymatic";

import { type ClientBilliardContext } from "./ClientContext";

/** Publishes the status line of the game against the computer onto the hud - see HudData. */
export class StatusComputer extends Middleware<ClientBilliardContext> {
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
        context.shotInProgress,
        context.gameOver,
        context.winner,
      )
    ) {
      const status = [];
      if (context.gameOver) {
        status.push(context.winner === player?.id ? "Você venceu" : "O computador venceu");
        status.push("Clique em Computador para nova partida");
      } else {
        if (player?.color) {
          status.push("Você joga " + (player.color === "stripe" ? "listradas" : "lisas"));
        }
        if (context.shotInProgress) {
          status.push("Tacada em andamento");
        } else if (context.turn?.current && player?.turn) {
          status.push(context.turn.current === player.turn ? "Sua vez" : "Vez do computador");
        }
      }
      context.hud.statusText.value = status.join(" | ");
    }
  };
}
