import { useSignal } from "@preact/signals";
import { TbSwords } from "react-icons/tb";
import { runtime } from "../async-signals";
import { createRoom } from "../shell/actions";
import { navigate } from "../shell/router";
import { currentUser } from "../shell/auth-store";
import styles from "../shell/Platform.module.css";

const FEE_OPTIONS = [50, 100, 200, 500];

export function CompetitivePage() {
  const selectedFee = useSignal(100);
  const starting = useSignal(false);
  const user = currentUser.value;

  const start = () => {
    const rt = runtime.value;
    if (!rt) return;
    if (!user) {
      navigate("/login");
      return;
    }
    starting.value = true;
    createRoom(rt, selectedFee.value);
    navigate("/");
  };

  return (
    <div>
      <div class={styles.card} style="text-align: center;">
        <TbSwords size="3em" style="color: var(--accent); margin-bottom: 0.3em;" />
        <div class={styles.cardTitle}>Competitivo</div>
        <p style="color: var(--text-dim); font-size: 0.9em; margin-bottom: 1.2em;">
          Crie ou entre em uma partida competitiva com apostas de fichas. O vencedor leva todo o pote e sobe no ranking.
        </p>
      </div>

      <div class={styles.card}>
        <div class={styles.cardTitle}>Entrada (fichas)</div>
        <div class={styles.feeSelector}>
          {FEE_OPTIONS.map((fee) => (
            <button
              class={`${styles.feeOption} ${selectedFee.value === fee ? styles.feeOptionActive : ""}`}
              onClick={() => (selectedFee.value = fee)}
            >
              {fee}
            </button>
          ))}
        </div>
        {user && (
          <div style="font-size: 0.85em; color: var(--text-dim); margin-bottom: 0.8em;">
            Seu saldo: <strong style="color: var(--accent);">{user.available_balance ?? 0}</strong> fichas
          </div>
        )}
        <button class={styles.btn} style="width: 100%;" onClick={start} disabled={starting.value || !runtime.value}>
          {!user
            ? "Entrar para competir"
            : starting.value
            ? "Criando..."
            : `Criar Partida (${selectedFee.value} fichas)`}
        </button>
        {!user && (
          <div style="text-align: center; font-size: 0.8em; color: var(--text-muted); margin-top: 0.6em;">
            Faça login para participar de partidas competitivas.
          </div>
        )}
      </div>

      <div class={styles.card}>
        <div class={styles.cardTitle}>Como funciona</div>
        <ul style="color: var(--text-dim); font-size: 0.85em; padding-left: 1.2em; line-height: 1.8;">
          <li>Escolha o valor da entrada (aposta em fichas)</li>
          <li>O vencedor recebe o dobro da entrada (pote total)</li>
          <li>Vitórias aumentam seu rating Elo e posição no ranking</li>
          <li>Derrotas diminuem seu rating Elo</li>
          <li>Partidas competitivas são validadas pelo servidor</li>
        </ul>
      </div>
    </div>
  );
}
