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

export function ProfilePage({ username }: { username?: string }) {
  const profile = useSignal<any>(null);
  const matches = useSignal<any[]>([]);
  const achievements = useSignal<any[]>([]);
  const loading = useSignal(true);
  const editing = useSignal(false);
  const displayName = useSignal("");
  const bio = useSignal("");

  const targetUsername = username || currentUser.value?.username;

  useSignalEffect(() => {
    const u = username || currentUser.value?.username;
    if (!u) {
      loading.value = false;
      return;
    }
    loading.value = true;
    (async () => {
      try {
        const [p, m, a] = await Promise.all([
          username ? api.getProfile(username) : api.getMyProfile(),
          api.getMatchHistory(u, 1),
          api.getAchievements(u),
        ]);
        profile.value = p;
        displayName.value = p.display_name || p.username;
        bio.value = p.bio || "";
        matches.value = m.matches || [];
        achievements.value = a.achievements || [];
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        loading.value = false;
      }
    })();
  });

  const saveProfile = async () => {
    try {
      await api.updateProfile({ display_name: displayName.value, bio: bio.value });
      editing.value = false;
      profile.value = { ...profile.value, display_name: displayName.value, bio: bio.value };
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading.value) return <div class={styles.loading}>Carregando perfil...</div>;
  if (!profile.value) return <div class={styles.loading}>Faça login para ver seu perfil.</div>;

  const p = profile.value;
  const isOwn = !username || username === currentUser.value?.username;
  const league = getLeague(p.rating || 1000);
  const winRate = p.matches_played > 0 ? Math.round((p.wins / p.matches_played) * 100) : 0;

  return (
    <div>
      <div class={styles.card}>
        <div class={styles.profileHeader}>
          <div class={`${styles.avatar} ${styles.avatarLarge}`}>
            {(p.display_name || p.username || "?").charAt(0).toUpperCase()}
          </div>
          <div class={styles.profileInfo}>
            <div class={styles.profileName}>{p.display_name || p.username}</div>
            <div class={styles.profileUsername}>@{p.username}</div>
            {p.bio && <div class={styles.profileBio}>{p.bio}</div>}
            <div style="margin-top: 0.4em;">
              <span class={styles.leagueBadge} style={`background: ${league.color}33; color: ${league.color};`}>
                {league.name} · {p.rating || 1000} pts
              </span>
            </div>
          </div>
          {isOwn && !editing.value && (
            <button class={`${styles.btn} ${styles.btnSmall} ${styles.btnSecondary}`} onClick={() => (editing.value = true)}>
              Editar
            </button>
          )}
        </div>

        {editing.value && (
          <div style="margin-top: 1em;">
            <div class={styles.formGroup}>
              <label class={styles.formLabel}>Nome de exibição</label>
              <input class={styles.formInput} value={displayName.value} onInput={(e: any) => (displayName.value = e.target.value)} />
            </div>
            <div class={styles.formGroup}>
              <label class={styles.formLabel}>Bio</label>
              <textarea class={`${styles.formInput} ${styles.formTextArea}`} value={bio.value} onInput={(e: any) => (bio.value = e.target.value)} />
            </div>
            <div style="display: flex; gap: 0.4em;">
              <button class={`${styles.btn} ${styles.btnSmall}`} onClick={saveProfile}>Salvar</button>
              <button class={`${styles.btn} ${styles.btnSmall} ${styles.btnSecondary}`} onClick={() => (editing.value = false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div class={styles.card}>
        <div class={styles.cardTitle}>Estatísticas</div>
        <div class={styles.statsGrid}>
          <div class={styles.statBox}>
            <div class={styles.statValue}>{p.matches_played || 0}</div>
            <div class={styles.statLabel}>Partidas</div>
          </div>
          <div class={styles.statBox}>
            <div class={styles.statValue}>{p.wins || 0}</div>
            <div class={styles.statLabel}>Vitórias</div>
          </div>
          <div class={styles.statBox}>
            <div class={styles.statValue}>{p.losses || 0}</div>
            <div class={styles.statLabel}>Derrotas</div>
          </div>
          <div class={styles.statBox}>
            <div class={styles.statValue}>{winRate}%</div>
            <div class={styles.statLabel}>Aproveitamento</div>
          </div>
          <div class={styles.statBox}>
            <div class={styles.statValue}>{p.current_streak || 0}</div>
            <div class={styles.statLabel}>Sequência atual</div>
          </div>
          <div class={styles.statBox}>
            <div class={styles.statValue}>{p.best_streak || 0}</div>
            <div class={styles.statLabel}>Melhor sequência</div>
          </div>
          {isOwn && (
            <div class={styles.statBox}>
              <div class={styles.statValue}>{p.available_balance || 0}</div>
              <div class={styles.statLabel}>Fichas</div>
            </div>
          )}
          {isOwn && (
            <div class={styles.statBox}>
              <div class={styles.statValue}>{p.total_earned || 0}</div>
              <div class={styles.statLabel}>Total ganho</div>
            </div>
          )}
        </div>
      </div>

      {achievements.value.length > 0 && (
        <div class={styles.card}>
          <div class={styles.cardTitle}>Conquistas</div>
          <div class={styles.achievementGrid}>
            {achievements.value.map((a: any) => (
              <div class={`${styles.achievementCard} ${a.unlocked_at ? styles.achievementUnlocked : ""}`}>
                <div class={styles.achievementIcon}>{a.unlocked_at ? "🏆" : "🔒"}</div>
                <div class={styles.achievementInfo}>
                  <div class={styles.achievementName}>{a.name}</div>
                  <div class={styles.achievementDesc}>{a.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div class={styles.card}>
        <div class={styles.cardTitle}>Histórico de Partidas</div>
        {matches.value.length === 0 ? (
          <div class={styles.loading}>Nenhuma partida jogada ainda.</div>
        ) : (
          matches.value.map((m: any) => (
            <div class={styles.matchRow} key={m.id}>
              <div>
                <div class={styles.matchResult}>
                  <span class={m.result === "win" ? styles.win : styles.loss}>
                    {m.result === "win" ? "VITÓRIA" : "DERROTA"}
                  </span>
                  {" vs "}
                  <span style="cursor: pointer; text-decoration: underline;" onClick={() => navigate(`/profile/${m.opponent_username}`)}>
                    {m.opponent_username || "?"}
                  </span>
                </div>
                <div style="font-size: 0.75em; color: var(--text-muted);">
                  {m.match_type === "competitive" ? "Competitiva" : "Casual"}
                  {m.rating_change ? ` · ${m.rating_change > 0 ? "+" : ""}${m.rating_change} pts` : ""}
                  {m.completed_at ? ` · ${new Date(m.completed_at).toLocaleDateString("pt-BR")}` : ""}
                </div>
              </div>
              {m.entry_fee > 0 && (
                <div style="font-size: 0.8em; color: var(--accent);">
                  {m.result === "win" ? "+" : "-"}{m.entry_fee}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
