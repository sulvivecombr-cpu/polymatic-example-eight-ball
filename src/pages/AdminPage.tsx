import { useSignal, useSignalEffect } from "@preact/signals";
import { api } from "../shell/api";
import styles from "../shell/Platform.module.css";

export function AdminPage() {
  const stats = useSignal<any>(null);
  const users = useSignal<any[]>([]);
  const disputed = useSignal<any[]>([]);
  const loading = useSignal(true);
  const search = useSignal("");
  const selectedUser = useSignal<any>(null);
  const adjustAmount = useSignal(0);
  const adjustReason = useSignal("");
  const adminMsg = useSignal<string | null>(null);

  const loadAll = async () => {
    try {
      const [s, u, d] = await Promise.all([
        api.adminGetStats(),
        api.adminGetUsers(1, ""),
        api.adminGetDisputedMatches(),
      ]);
      stats.value = s;
      users.value = u.users || [];
      disputed.value = d.matches || [];
    } catch (err) {
      console.error("Admin load error:", err);
    } finally {
      loading.value = false;
    }
  };

  useSignalEffect(() => {
    loadAll();
  });

  const searchUsers = async () => {
    try {
      const result = await api.adminGetUsers(1, search.value);
      users.value = result.users || [];
    } catch {}
  };

  const doAdjust = async () => {
    if (!selectedUser.value || !adjustReason.value) return;
    try {
      await api.adminAdjustWallet(selectedUser.value.id, adjustAmount.value, adjustReason.value);
      adminMsg.value = "Ajuste aplicado com sucesso";
      adjustAmount.value = 0;
      adjustReason.value = "";
      setTimeout(() => (adminMsg.value = null), 3000);
    } catch (err: any) {
      adminMsg.value = err.message;
    }
  };

  const toggleSuspend = async (user: any) => {
    try {
      await api.adminSuspendUser(user.id, !user.is_suspended);
      await searchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading.value) return <div class={styles.loading}>Carregando painel admin...</div>;

  return (
    <div>
      {stats.value && (
        <div class={styles.card}>
          <div class={styles.cardTitle}>Estatísticas da Plataforma</div>
          <div class={styles.statsGrid}>
            <div class={styles.statBox}>
              <div class={styles.statValue}>{stats.value.users?.c || 0}</div>
              <div class={styles.statLabel}>Usuários</div>
            </div>
            <div class={styles.statBox}>
              <div class={styles.statValue}>{stats.value.matches?.completed || 0}</div>
              <div class={styles.statLabel}>Partidas completas</div>
            </div>
            <div class={styles.statBox}>
              <div class={styles.statValue}>{stats.value.matches?.disputed || 0}</div>
              <div class={styles.statLabel}>Disputas</div>
            </div>
            <div class={styles.statBox}>
              <div class={styles.statValue}>{stats.value.tokens?.total_available || 0}</div>
              <div class={styles.statLabel}>Fichas em circulação</div>
            </div>
          </div>
        </div>
      )}

      <div class={styles.card}>
        <div class={styles.cardTitle}>Gerenciar Usuários</div>
        <div style="display: flex; gap: 0.4em; margin-bottom: 0.8em;">
          <input class={styles.formInput} placeholder="Buscar..." value={search.value} onInput={(e: any) => (search.value = e.target.value)} onKeyUp={(e: any) => e.key === "Enter" && searchUsers()} />
          <button class={`${styles.btn} ${styles.btnSmall}`} onClick={searchUsers}>Buscar</button>
        </div>
        <table class={styles.adminTable}>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Email</th>
              <th>Admin</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.value.map((u: any) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.is_admin ? "✓" : ""}</td>
                <td>{u.is_suspended ? "Suspenso" : "Ativo"}</td>
                <td>
                  <button class={`${styles.btn} ${styles.btnSmall} ${styles.btnSecondary}`} onClick={() => (selectedUser.value = u)}>Carteira</button>
                  {" "}
                  <button class={`${styles.btn} ${styles.btnSmall} ${u.is_suspended ? styles.btnSecondary : styles.btnDanger}`} onClick={() => toggleSuspend(u)}>
                    {u.is_suspended ? "Reativar" : "Suspender"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser.value && (
        <div class={styles.card}>
          <div class={styles.cardTitle}>Ajustar Carteira — {selectedUser.value.username}</div>
          {adminMsg.value && <div style="margin-bottom: 0.6em; color: var(--accent);">{adminMsg.value}</div>}
          <div class={styles.formGroup}>
            <label class={styles.formLabel}>Valor (+ ou -)</label>
            <input class={styles.formInput} type="number" value={adjustAmount.value} onInput={(e: any) => (adjustAmount.value = parseInt(e.target.value) || 0)} />
          </div>
          <div class={styles.formGroup}>
            <label class={styles.formLabel}>Motivo</label>
            <input class={styles.formInput} value={adjustReason.value} onInput={(e: any) => (adjustReason.value = e.target.value)} />
          </div>
          <button class={styles.btn} onClick={doAdjust}>Aplicar Ajuste</button>
        </div>
      )}

      <div class={styles.card}>
        <div class={styles.cardTitle}>Partidas Disputadas / Em Andamento</div>
        {disputed.value.length === 0 ? (
          <div class={styles.loading}>Nenhuma partida disputada.</div>
        ) : (
          disputed.value.map((m: any) => (
            <div class={styles.matchRow} key={m.id}>
              <div>
                <div style="font-weight: 700;">{m.player1} vs {m.player2}</div>
                <div style="font-size: 0.75em; color: var(--text-muted);">
                  {m.status} · {m.match_type} · entrada {m.entry_fee}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
