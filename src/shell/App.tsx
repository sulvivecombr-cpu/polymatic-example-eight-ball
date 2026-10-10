import { GameContext } from "./context";
import { runtime } from "../async-signals";
import { route } from "./router";
import { currentUser, authLoading } from "./auth-store";
import { Hud } from "./Hud";
import { TopBar, DesktopNav, BottomNav } from "./Navigation";
import { AuthPage } from "../pages/AuthPage";
import { ComputerPage } from "../pages/ComputerPage";
import { PracticePage } from "../pages/PracticePage";
import { CreateRoomPage } from "../pages/CreateRoomPage";
import { JoinRoomPage } from "../pages/JoinRoomPage";
import { CompetitivePage } from "../pages/CompetitivePage";
import { ProfilePage } from "../pages/ProfilePage";
import { WalletPage } from "../pages/WalletPage";
import { LeaderboardPage } from "../pages/LeaderboardPage";
import { MatchHistoryPage } from "../pages/MatchHistoryPage";
import { AdminPage } from "../pages/AdminPage";
import styles from "./Platform.module.css";

/**
 * The shell. It mounts before the lobby exists (see client.tsx), so the read
 * below is guarded: `runtime` fills in once the lobby has been activated.
 */
export function App() {
  const lobby = runtime.value;
  const r = route.value;
  const user = currentUser.value;
  const loading = authLoading.value;

  // Game route: show the pool table + HUD, no platform shell
  if (r.name === "game") {
    return (
      <GameContext.Provider value={lobby}>
        {lobby && <Hud />}
      </GameContext.Provider>
    );
  }

  // Auth route: show auth page without nav
  if (r.name === "auth") {
    return <AuthPage />;
  }

  // Platform pages: show with navigation
  const showAdmin = r.name === "admin" && user?.is_admin;

  return (
    <div class={styles.platformShell}>
      <TopBar />
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 1em; background: var(--bg-card); border-bottom: 1px solid var(--border);">
        <DesktopNav />
      </div>
      <div class={styles.platformContent}>
        {loading ? (
          <div class={styles.loading}>Carregando...</div>
        ) : r.name === "computer" ? (
          <ComputerPage />
        ) : r.name === "practice" ? (
          <PracticePage />
        ) : r.name === "create-room" ? (
          <CreateRoomPage />
        ) : r.name === "join-room" ? (
          <JoinRoomPage />
        ) : r.name === "competitive" ? (
          <CompetitivePage />
        ) : r.name === "profile" ? (
          <ProfilePage username={r.username} />
        ) : r.name === "wallet" ? (
          <WalletPage />
        ) : r.name === "leaderboard" ? (
          <LeaderboardPage />
        ) : r.name === "matches" ? (
          <MatchHistoryPage username={r.username} />
        ) : showAdmin ? (
          <AdminPage />
        ) : (
          <div class={styles.loading}>Página não encontrada.</div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
