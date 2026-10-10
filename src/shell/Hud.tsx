import { useSignal } from "@preact/signals";
import { TbDoorEnter, TbPlayerPlay, TbPlus, TbRobot, TbSwords } from "react-icons/tb";

import { useRuntime } from "./context";
import { createRoom, openJoin, playComputer, playOffline } from "./actions";
import { JoinDialog } from "./JoinDialog";
import { NoticeDialog, RejoinDialog } from "./RoomDialogs";
import { currentUser } from "./auth-store";
import { navigate } from "./router";
import styles from "./Shell.module.css";
import pstyles from "./Platform.module.css";

const FEE_OPTIONS = [0, 50, 100, 200, 500];

/** The status lines above the table, and the lobby controls below it. */
export function Hud() {
  const runtime = useRuntime();
  const { joinOpen, rejoinRoom, notice } = runtime.hud;

  return (
    <>
      <Status />
      <Controls />
      {joinOpen.value && <JoinDialog />}
      {rejoinRoom.value && <RejoinDialog />}
      {notice.value && !rejoinRoom.value && <NoticeDialog />}
    </>
  );
}

function Status() {
  const { room, statusText, roomError, matchError, isCompetitive } = useRuntime().hud;

  return (
    <div class={styles.status}>
      {room.value && (
        <span class={`${styles.line} ${styles.room}`} aria-label="Room id">
          {room.value}
          {isCompetitive.value && " ⚔️"}
        </span>
      )}
      {statusText.value && !roomError.value && <span class={styles.line}>{statusText.value}</span>}
      {roomError.value && <span class={`${styles.line} ${styles.error}`}>{roomError.value}</span>}
      {matchError.value && !roomError.value && (
        <span class={`${styles.line} ${styles.error}`}>{matchError.value}</span>
      )}
    </div>
  );
}

function Controls() {
  const runtime = useRuntime();
  const showFees = useSignal(false);
  const selectedFee = useSignal(0);
  const user = currentUser.value;

  const handleCreateCompetitive = () => {
    showFees.value = false;
    if (!user) {
      navigate("/login");
      return;
    }
    createRoom(runtime, selectedFee.value);
  };

  return (
    <>
      <div class={styles.controls}>
        <button type="button" class={styles.button} onClick={() => playComputer(runtime)}>
          <TbRobot aria-hidden size="1em" /> Computador
        </button>
        <button type="button" class={styles.button} onClick={() => playOffline(runtime)}>
          <TbPlayerPlay aria-hidden size="1em" /> Praticar
        </button>
        <button type="button" class={styles.button} onClick={() => createRoom(runtime, 0)}>
          <TbPlus aria-hidden size="1em" /> Criar Sala
        </button>
        <button type="button" class={styles.button} onClick={() => openJoin(runtime)}>
          <TbDoorEnter aria-hidden size="1em" /> Entrar Sala
        </button>
        <button type="button" class={styles.button} onClick={() => showFees.value = !showFees.value}>
          <TbSwords aria-hidden size="1em" /> Competitivo
        </button>
      </div>

      {showFees.value && (
        <div class={pstyles.modeSelector}>
          <div style="font-weight: 700; margin-bottom: 0.5em; font-size: 0.9em;">Entrada (fichas)</div>
          <div class={pstyles.feeSelector}>
            {FEE_OPTIONS.filter((f) => f > 0).map((fee) => (
              <button
                class={`${pstyles.feeOption} ${selectedFee.value === fee ? pstyles.feeOptionActive : ""}`}
                onClick={() => (selectedFee.value = fee)}
              >
                {fee}
              </button>
            ))}
          </div>
          {user && (
            <div style="font-size: 0.8em; color: var(--text-dim); margin-bottom: 0.5em;">
              Saldo: {user.available_balance ?? 0} fichas
            </div>
          )}
          <button class={pstyles.btn} style="width: 100%;" onClick={handleCreateCompetitive} disabled={!user}>
            {user ? `Criar Partida (${selectedFee.value} fichas)` : "Entrar para competir"}
          </button>
        </div>
      )}
    </>
  );
}
