import { signal } from "@preact/signals";

export type Route =
  | { name: "game" }
  | { name: "auth" }
  | { name: "profile"; username?: string }
  | { name: "wallet" }
  | { name: "leaderboard" }
  | { name: "matches"; username?: string }
  | { name: "admin" };

export const route = signal<Route>({ name: "game" });

function parseHash(): Route {
  const hash = window.location.hash.slice(1) || "/";
  const parts = hash.split("/").filter(Boolean);

  if (parts.length === 0) return { name: "game" };
  if (parts[0] === "login") return { name: "auth" };
  if (parts[0] === "profile") return { name: "profile", username: parts[1] };
  if (parts[0] === "wallet") return { name: "wallet" };
  if (parts[0] === "leaderboard") return { name: "leaderboard" };
  if (parts[0] === "matches") return { name: "matches", username: parts[1] };
  if (parts[0] === "admin") return { name: "admin" };
  return { name: "game" };
}

export function navigate(path: string) {
  window.location.hash = path;
}

function handleHashChange() {
  route.value = parseHash();
}

window.addEventListener("hashchange", handleHashChange);
route.value = parseHash();
