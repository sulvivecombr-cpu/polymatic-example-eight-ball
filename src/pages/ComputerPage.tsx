import { useSignal } from "@preact/signals";
import { TbRobot } from "react-icons/tb";
import { runtime } from "../async-signals";
import { playComputer } from "../shell/actions";
import { navigate } from "../shell/router";
import styles from "../shell/Platform.module.css";

export function ComputerPage() {
  const starting = useSignal(false);

  const start = () => {
    const rt = runtime.value;
    if (!rt) return;
    starting.value = true;
    playComputer(rt);
    navigate("/");
  };

  return (
    <div>
      <div class={styles.card} style="text-align: center;">
        <TbRobot size="3em" style="color: var(--accent); margin-bottom: 0.3em;" />
        <div class={styles.cardTitle}>Computador</div>
        <p style="color: var(--text-dim); font-size: 0.9em; margin-bottom: 1.2em;">
          Jogue contra a IA em uma partida casual de 8-ball. Sem apostas, sem ranking — pura diversão para afiar suas habilidades.
        </p>
        <button class={styles.btn} style="width: 100%;" onClick={start} disabled={starting.value || !runtime.value}>
          {starting.value ? "Iniciando..." : "Jogar contra a IA"}
        </button>
      </div>

      <div class={styles.card}>
        <div class={styles.cardTitle}>Como funciona</div>
        <ul style="color: var(--text-dim); font-size: 0.85em; padding-left: 1.2em; line-height: 1.8;">
          <li>Você joga com as bolas listradas ou lisas</li>
          <li>A IA responde com jogadas automáticas</li>
          <li>Encaçape todas as suas bolas e depois a 8-ball para vencer</li>
          <li>Partida casual — não afeta seu saldo ou ranking</li>
        </ul>
      </div>
    </div>
  );
}
