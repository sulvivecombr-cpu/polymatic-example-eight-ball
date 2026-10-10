import { TbCoin, TbHome, TbTrophy, TbUser, TbHistory } from "react-icons/tb";
import { currentUser, logout } from "./auth-store";
import { route, navigate } from "./router";
import styles from "./Platform.module.css";

const NAV_ITEMS = [
  { name: "game", label: "Jogar", icon: TbHome, hash: "/" },
  { name: "leaderboard", label: "Ranking", icon: TbTrophy, hash: "/leaderboard" },
  { name: "wallet", label: "Carteira", icon: TbCoin, hash: "/wallet", auth: true },
  { name: "matches", label: "Partidas", icon: TbHistory, hash: "/matches", auth: true },
  { name: "profile", label: "Perfil", icon: TbUser, hash: "/profile", auth: true },
] as const;

export function TopBar() {
  const user = currentUser.value;
  return (
    <div class={styles.topBar}>
      <div class={styles.topBarLeft}>
        <span class={styles.logo} onClick={() => navigate("/")}>
          🎱 8-Ball Arena
        </span>
      </div>
      <div class={styles.topBarRight}>
        {user && (
          <div class={styles.tokenBadge} onClick={() => navigate("/wallet")} style="cursor: pointer;">
            <TbCoin size="1em" /> {user.available_balance ?? 0}
          </div>
        )}
        {user ? (
          <div class={styles.userChip} onClick={() => navigate("/profile")}>
            <TbUser size="1em" /> {user.username}
            {user.is_admin && " ⚡"}
          </div>
        ) : (
          <button class={`${styles.btn} ${styles.btnSmall}`} onClick={() => navigate("/login")}>
            Entrar
          </button>
        )}
      </div>
    </div>
  );
}

export function DesktopNav() {
  const user = currentUser.value;
  return (
    <div class={styles.desktopNav}>
      {NAV_ITEMS.map((item) => {
        if (item.auth && !user) return null;
        const active = route.value.name === item.name;
        return (
          <button
            class={`${styles.desktopNavItem} ${active ? styles.desktopNavActive : ""}`}
            onClick={() => navigate(item.hash)}
          >
            {item.label}
          </button>
        );
      })}
      {user?.is_admin && (
        <button
          class={`${styles.desktopNavItem} ${route.value.name === "admin" ? styles.desktopNavActive : ""}`}
          onClick={() => navigate("/admin")}
        >
          Admin
        </button>
      )}
      {user && (
        <button class={styles.desktopNavItem} onClick={() => { logout(); navigate("/"); }}>
          Sair
        </button>
      )}
    </div>
  );
}

export function BottomNav() {
  const user = currentUser.value;
  return (
    <div class={styles.bottomNav}>
      {NAV_ITEMS.map((item) => {
        if (item.auth && !user) return null;
        const active = route.value.name === item.name;
        const Icon = item.icon;
        return (
          <button
            class={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            onClick={() => navigate(item.hash)}
          >
            <Icon size="1.3em" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
