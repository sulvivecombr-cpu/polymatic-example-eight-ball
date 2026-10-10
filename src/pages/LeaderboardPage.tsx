import { useSignal, useSignalEffect } from "@preact/signals";
import { api } from "../shell/api";
import { currentUser } from "../shell/auth-store";
import { navigate } from "../shell/router";
import styles from "../shell/Platform.module.css";

function getLeague(rating: number): { name: string; color: string } {
  if (rating >= 2400) return { name: "Mestre", color: "#9370db" };
  if (rating >= 2100) return { name: "Diamante", color: "#b9f2ff" };
  if (rating >= 1800) return { name: "Platina", color: "#e5e4e2" };
  if (rating >= 1500) return { name: "Ouro", color: "#ffd700" };
  if (rating >= 1200) return { name: "Prata", color: "#c0c0c0" };
  return { name: "Bronze", color: "#cd7f32" };
}

export function LeaderboardPage() {
  const entries = useSignal<any[]>([]);
  const myRank = useSignal<any>(null);
  const loading = useSignal(true);
  const period = useSignal("all");

  useSignalEffect(() => {
    loading.value = true;
    (async () => {
      try {
        const [lb, mr] = await Promise.all([
          api.getLeaderboard(1, period.value),
          currentUser.value ? api.getMyRank() : Promise.resolve(null),
        ]);
        entries.value = lb.entries || [];
        myRank.value = mr;
      } catch (err) {
        console.error("Leaderboard error:", err);
      } finally {
        loading.value = false;
      }
    })();
  });

  if (loading.value) return <div class={styles.loading}>Carregando ranking...</div>;

  return (
    <div>
      <div class={styles.card}>
        <div class={styles.sectionHeader}>
          <div class={styles.cardTitle}>Ranking Global</div>
          <div style="display: flex; gap: 0.3em;">
            {["all", "weekly", "monthly"].map((p) => (
              <button
                class={`${styles.feeOption} ${period.value === p ? styles.feeOptionActive : ""}`}
                style="padding: 0.3em 0.6em; font-size: 0.8em;"
                onClick={() => (period.value = p)}
              >
                {p === "all" ? "Geral" : p === "weekly" ? "Semanal" : "Mensal"}
              </button>
            ))}
          </div>
        </div>

        {myRank.value && (
          <div style="margin-bottom: 1em; padding: 0.8em; background: var(--bg-elevated); border-radius: var(--radius); display: flex; justify-content: space-between;">
            <span style="font-weight: 700;">Sua posição: #{myRank.value.rank}</span>
            <span style="color: var(--accent);">{myRank.value.rating} pts</span>
          </div>
        )}

        {entries.value.length === 0 ? (
          <div class={styles.loading}>Nenhum jogador no ranking ainda.</div>
        ) : (
          entries.value.map((entry: any) => {
            const league = getLeague(entry.rating || 1000);
            const rankClass = entry.rank === 1 ? styles.rank1 : entry.rank === 2 ? styles.rank2 : entry.rank === 3 ? styles.rank3 : "";
            return (
              <div class={styles.leaderboardRow} key={entry.id} onClick={() => navigate(`/profile/${entry.username}`)} style="cursor: pointer;">
                <div class={`${styles.rankBadge} ${rankClass}`}>#{entry.rank}</div>
                <div>
                  <div style="font-weight: 700;">{entry.display_name || entry.username}</div>
                  <div style="font-size: 0.75em; color: var(--text-dim);">
                    <span class={styles.leagueBadge} style={`background: ${league.color}33; color: ${league.color}; font-size: 0.9em;`}>
                      {league.name}
                    </span>
                    {" · "}
                    {entry.matches_played} partidas · {entry.wins}V {entry.losses}D
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 700; color: var(--accent);">{entry.rating}</div>
                  <div style="font-size: 0.7em; color: var(--text-muted);">pts</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div class={styles.card}>
        <div class={styles.cardTitle}>Ligas</div>
        <div style="display: flex; flex-direction: column; gap: 0.4em;">
          {[
            { name: "Mestre", min: 2400, color: "#9370db" },
            { name: "Diamante", min: 2100, color: "#b9f2ff" },
            { name: "Platina", min: 1800, color: "#e5e4e2" },
            { name: "Ouro", min: 1500, color: "#ffd700" },
            { name: "Prata", min: 1200, color: "#c0c0c0" },
            { name: "Bronze", min: 0, color: "#cd7f32" },
          ].map((tier) => (
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.4em 0.6em; background: var(--bg-elevated); border-radius: var(--radius);">
              <span class={styles.leagueBadge} style={`background: ${tier.color}33; color: ${tier.color};`}>{tier.name}</span>
              <span style="font-size: 0.85em; color: var(--text-dim);">{tier.min}+ pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
