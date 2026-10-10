import { useSignal } from "@preact/signals";
import { TbDoorEnter } from "react-icons/tb";
import { runtime } from "../async-signals";
import { joinRoom } from "../shell/actions";
import { navigate } from "../shell/router";
import styles from "../shell/Platform.module.css";

export function JoinRoomPage() {
  const roomId = useSignal("");
  const error = useSignal<string | null>(null);
  const joining = useSignal(false);

  const submit = (ev: Event) => {
    ev.preventDefault();
    const rt = runtime.value;
    if (!rt) {
      error.value = "Jogo ainda carregando, tente novamente.";
      return;
    }
    if (!roomId.value.trim()) {
      error.value = "Digite o ID da sala.";
      return;
    }
    error.value = null;
    joining.value = true;
    joinRoom(rt, roomId.value.trim());
    navigate("/");
  };

  return (
    <div>
      <div class={styles.card} style="text-align: center;">
        <TbDoorEnter size="3em" style="color: var(--accent); margin-bottom: 0.3em;" />
        <div class={styles.cardTitle}>Entrar Sala</div>
        <p style="color: var(--text-dim); font-size: 0.9em; margin-bottom: 1.2em;">
          Digite o ID da sala que seu amigo compartilhou com você para entrar na partida.
        </p>
        <form onSubmit={submit}>
          <div class={styles.formGroup}>
            <input
              class={styles.formInput}
              value={roomId.value}
              placeholder="xxx-xxx-xxx"
              style="text-align: center; font-size: 1.1em; letter-spacing: 0.1em;"
              autoFocus
              onInput={(e: any) => (roomId.value = e.target.value)}
            />
          </div>
          {error.value && <div class={styles.authError}>{error.value}</div>}
          <button type="submit" class={styles.btn} style="width: 100%;" disabled={joining.value}>
            {joining.value ? "Entrando..." : "Entrar na sala"}
          </button>
        </form>
      </div>

      <div class={styles.card}>
        <div class={styles.cardTitle}>Como funciona</div>
        <ul style="color: var(--text-dim); font-size: 0.85em; padding-left: 1.2em; line-height: 1.8;">
          <li>Peça o ID da sala para quem criou a partida</li>
          <li>Digite o ID no campo acima e clique em Entrar</li>
          <li>Partida casual — sem apostas de fichas</li>
          <li>O jogo começa assim que você entrar na sala</li>
        </ul>
      </div>
    </div>
  );
}
