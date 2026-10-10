import { useRuntime } from "./context";
import { closeNotice, declineRejoin, rejoinRoom } from "./actions";
import styles from "./Shell.module.css";

/** This browser was in a room that is still running, see LobbyClient. */
export function RejoinDialog() {
  const runtime = useRuntime();

  return (
    <div class={styles.backdrop} onClick={() => declineRejoin(runtime)}>
      <div
        class={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Voltar à sala"
        onClick={(ev) => ev.stopPropagation()}
      >
        <span class={styles.dialogTitle}>Voltar à sala {runtime.hud.rejoinRoom.value}?</span>
        <span>Sua partida ainda está em andamento.</span>
        <div class={styles.dialogActions}>
          <button type="button" class={styles.button} onClick={() => declineRejoin(runtime)}>
            Ficar offline
          </button>
          <button type="button" class={styles.button} onClick={() => rejoinRoom(runtime)} autoFocus>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

/** A one-time message, like a room the player was in having closed. */
export function NoticeDialog() {
  const runtime = useRuntime();

  return (
    <div class={styles.backdrop} onClick={() => closeNotice(runtime)}>
      <div
        class={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-label="Aviso"
        onClick={(ev) => ev.stopPropagation()}
      >
        <span>{runtime.hud.notice.value}</span>
        <div class={styles.dialogActions}>
          <button type="button" class={styles.button} onClick={() => closeNotice(runtime)} autoFocus>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
