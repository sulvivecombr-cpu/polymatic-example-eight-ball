import { useSignal, useSignalEffect } from "@preact/signals";
import { api } from "../shell/api";
import { currentUser } from "../shell/auth-store";
import { navigate } from "../shell/router";
import styles from "../shell/Platform.module.css";

export function MatchHistoryPage({ username }: { username?: string }) {
  const matches = useSignal<any[]>([]);
  const total = useSignal(0);
  const page = useSignal(1);
  const loading = useSignal(true);

  const targetUsername = username || currentUser.value?.username;

  useSignalEffect(() => {
    if (!targetUsername) {
      loading.value = false;
      return;
    }
    loading.value = true;
    (async () => {
      try {
        const result = await api.getMatchHistory(targetUsername, page.value);
        matches.value = result.matches || [];
        total.value = result.total || 0;
      } catch (err) {
        console.error("Match history error:", err);
      } finally {
        loading.value = false;
      }
    })();
  });

  if (loading.value) return <div class={styles.loading}>Carregando histórico...</div>;
  if (!targetUsername) return <div class={styles.loading}>Faça login para ver seu histórico.</div>;

  const totalPages = Math.ceil(total.value / 20);

  return (
    <div>
      <div class={styles.card}>
        <div class={styles.cardTitle}>Histórico de Partidas</div>
        {matches.value.length === 0 ? (
          <div class={styles.loading}>Nenhuma partida jogada ainda.</div>
        ) : (
          matches.value.map((m: any) => (
            <div class={styles.matchRow} key={m.id}>
              <div>
                <div class={styles.matchResult}>
                  <span class={m.result === "win" ? styles.win : m.result === "loss" ? styles.loss : ""}>
                    {m.result === "win" ? "VITÓRIA" : m.result === "loss" ? "DERROTA" : "EM ANDAMENTO"}
                  </span>
                  {" vs "}
                  <span style="cursor: pointer; text-decoration: underline;" onClick={() => navigate(`/profile/${m.opponent_username}`)}>
                    {m.opponent_username || "?"}
                  </span>
                </div>
                <div style="font-size: 0.75em; color: var(--text-muted);">
                  {m.match_type === "competitive" ? "Competitiva" : "Casual"}
                  {m.entry_fee > 0 ? ` · Entrada: ${m.entry_fee}` : ""}
                  {m.rating_change ? ` · ${m.rating_change > 0 ? "+" : ""}${m.rating_change} pts` : ""}
                  {m.completed_at ? ` · ${new Date(m.completed_at).toLocaleString("pt-BR")}` : ""}
                </div>
              </div>
              {m.entry_fee > 0 && (
                <div style="font-size: 0.8em; color: var(--accent); text-align: right;">
                  {m.result === "win" ? "+" : m.result === "loss" ? "-" : ""}
                  {m.result === "win" ? m.entry_fee * 2 - m.entry_fee : m.entry_fee}
                </div>
              )}
            </div>
          ))
        )}
        {totalPages > 1 && (
          <div class={styles.pagination}>
            <button class={`${styles.btn} ${styles.btnSmall} ${styles.btnSecondary}`} disabled={page.value <= 1} onClick={() => (page.value--)}>
              Anterior
            </button>
            <span style="padding: 0.4em; color: var(--text-dim);">Página {page.value}/{totalPages}</span>
            <button class={`${styles.btn} ${styles.btnSmall} ${styles.btnSecondary}`} disabled={page.value >= totalPages} onClick={() => (page.value++)}>
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
