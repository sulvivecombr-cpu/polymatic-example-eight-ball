import { useSignal } from "@preact/signals";
import { TbPlayerPlay } from "react-icons/tb";
import { runtime } from "../async-signals";
import { playOffline } from "../shell/actions";
import { navigate } from "../shell/router";
import styles from "../shell/Platform.module.css";

export function PracticePage() {
  const starting = useSignal(false);

  const start = () => {
    const rt = runtime.value;
    if (!rt) return;
    starting.value = true;
    playOffline(rt);
    navigate("/");
  };

  return (
    <div>
      <div class={styles.card} style="text-align: center;">
        <TbPlayerPlay size="3em" style="color: var(--accent); margin-bottom: 0.3em;" />
        <div class={styles.cardTitle}>Praticar</div>
        <p style="color: var(--text-dim); font-size: 0.9em; margin-bottom: 1.2em;">
          Modo livre sem oponente e sem turnos. Pratique suas tacadas, experimente jogadas e domine a física da mesa no seu ritmo.
        </p>
        <button class={styles.btn} style="width: 100%;" onClick={start} disabled={starting.value || !runtime.value}>
          {starting.value ? "Iniciando..." : "Começar a praticar"}
        </button>
      </div>

      <div class={styles.card}>
        <div class={styles.cardTitle}>Como funciona</div>
        <ul style="color: var(--text-dim); font-size: 0.85em; padding-left: 1.2em; line-height: 1.8;">
          <li>Você controla todas as jogadas, sem turnos</li>
          <li>Sem oponente e sem pressão de tempo</li>
          <li>Ideal para treinar posicionamento e efeitos</li>
          <li>Partida livre — não afeta seu saldo ou ranking</li>
        </ul>
      </div>
    </div>
  );
}
