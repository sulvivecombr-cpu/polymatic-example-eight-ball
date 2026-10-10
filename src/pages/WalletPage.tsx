import { useSignal, useSignalEffect } from "@preact/signals";
import { api } from "../shell/api";
import styles from "../shell/Platform.module.css";

export function WalletPage() {
  const wallet = useSignal<any>(null);
  const transactions = useSignal<any[]>([]);
  const loading = useSignal(true);
  const claiming = useSignal(false);
  const claimMsg = useSignal<string | null>(null);

  const load = async () => {
    try {
      const [w, t] = await Promise.all([api.getWallet(), api.getTransactions(1)]);
      wallet.value = w;
      transactions.value = t.transactions || [];
    } catch (err) {
      console.error("Wallet load error:", err);
    } finally {
      loading.value = false;
    }
  };

  useSignalEffect(() => {
    load();
  });

  const claimDaily = async () => {
    claiming.value = true;
    claimMsg.value = null;
    try {
      const result = await api.claimDaily();
      claimMsg.value = `+${result.amount} fichas resgatadas!`;
      await load();
    } catch (err: any) {
      claimMsg.value = err.message;
    } finally {
      claiming.value = false;
    }
  };

  if (loading.value) return <div class={styles.loading}>Carregando carteira...</div>;
  if (!wallet.value) return <div class={styles.loading}>Faça login para ver sua carteira.</div>;

  const w = wallet.value;

  return (
    <div>
      <div class={styles.card} style="text-align: center;">
        <div style="font-size: 0.8em; color: var(--text-dim); margin-bottom: 0.3em;">Saldo Disponível</div>
        <div style="font-size: 2.5em; font-weight: 700; color: var(--accent);">{w.available_balance}</div>
        <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 0.2em;">fichas</div>
        {w.reserved_balance > 0 && (
          <div style="margin-top: 0.5em; font-size: 0.85em; color: var(--text-dim);">
            {w.reserved_balance} reservadas em partidas ativas
          </div>
        )}
        <button class={styles.btn} style="margin-top: 1em;" onClick={claimDaily} disabled={claiming.value}>
          {claiming.value ? "..." : "Resgatar Bônus Diário (+100)"}
        </button>
        {claimMsg.value && (
          <div style="margin-top: 0.5em; font-size: 0.85em; color: var(--accent);">{claimMsg.value}</div>
        )}
      </div>

      <div class={styles.statsGrid} style="margin-bottom: 1em;">
        <div class={styles.statBox}>
          <div class={styles.statValue}>{w.total_earned || 0}</div>
          <div class={styles.statLabel}>Total ganho</div>
        </div>
        <div class={styles.statBox}>
          <div class={styles.statValue}>{w.total_spent || 0}</div>
          <div class={styles.statLabel}>Total gasto</div>
        </div>
      </div>

      <div class={styles.card}>
        <div class={styles.cardTitle}>Histórico de Transações</div>
        {transactions.value.length === 0 ? (
          <div class={styles.loading}>Nenhuma transação ainda.</div>
        ) : (
          transactions.value.map((tx: any) => (
            <div class={styles.txRow} key={tx.id}>
              <div>
                <div style="font-weight: 700;">
                  {tx.reason || tx.type}
                </div>
                <div style="font-size: 0.75em; color: var(--text-muted);">
                  {new Date(tx.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <div class={`${styles.txAmount} ${parseInt(tx.amount) >= 0 ? styles.txPositive : styles.txNegative}`}>
                {parseInt(tx.amount) >= 0 ? "+" : ""}{tx.amount}
              </div>
            </div>
          ))
        )}
      </div>

      <div class={styles.card} style="font-size: 0.8em; color: var(--text-muted);">
        <p>As fichas são virtuais e não têm valor monetário. Não podem ser resgatadas por dinheiro.</p>
      </div>
    </div>
  );
}
