import { useSignal } from "@preact/signals";
import { TbPlus } from "react-icons/tb";
import { runtime } from "../async-signals";
import { createRoom } from "../shell/actions";
import { navigate } from "../shell/router";
import styles from "../shell/Platform.module.css";

export function CreateRoomPage() {
  const starting = useSignal(false);

  const start = () => {
    const rt = runtime.value;
    if (!rt) return;
    starting.value = true;
    createRoom(rt, 0);
    navigate("/");
  };

  return (
    <div>
      <div class={styles.card} style="text-align: center;">
        <TbPlus size="3em" style="color: var(--accent); margin-bottom: 0.3em;" />
        <div class={styles.cardTitle}>Criar Sala</div>
        <p style="color: var(--text-dim); font-size: 0.9em; margin-bottom: 1.2em;">
          Crie uma sala privada e convide um amigo para jogar. Compartilhe o ID da sala para seu oponente entrar.
        </p>
        <button class={styles.btn} style="width: 100%;" onClick={start} disabled={starting.value || !runtime.value}>
          {starting.value ? "Criando..." : "Criar nova sala"}
        </button>
      </div>

      <div class={styles.card}>
        <div class={styles.cardTitle}>Como funciona</div>
        <ul style="color: var(--text-dim); font-size: 0.85em; padding-left: 1.2em; line-height: 1.8;">
          <li>Você cria a sala e recebe um ID único</li>
          <li>Compartilhe o ID com seu amigo para ele entrar</li>
          <li>Partida casual — sem apostas de fichas</li>
          <li>O jogo começa assim que o segundo jogador entrar</li>
        </ul>
      </div>
    </div>
  );
}
