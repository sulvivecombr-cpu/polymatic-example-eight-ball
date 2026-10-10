const TOKEN_KEY = "pa_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Erro de conexão");
  }
  return data;
}

// Auth API
export const api = {
  register: (username: string, email: string, password: string) =>
    apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ username, email, password }) }),

  login: (username: string, password: string) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),

  me: () => apiFetch("/api/auth/me"),

  // Profile
  getMyProfile: () => apiFetch("/api/profile/me"),
  getProfile: (username: string) => apiFetch(`/api/profile/${username}`),
  updateProfile: (data: any) => apiFetch("/api/profile/me", { method: "PATCH", body: JSON.stringify(data) }),
  getMatchHistory: (username: string, page = 1) =>
    apiFetch(`/api/profile/${username}/matches?page=${page}`),
  getAchievements: (username: string) => apiFetch(`/api/profile/${username}/achievements`),

  // Wallet
  getWallet: () => apiFetch("/api/wallet"),
  getTransactions: (page = 1) => apiFetch(`/api/wallet/transactions?page=${page}`),
  claimDaily: () => apiFetch("/api/wallet/claim-daily", { method: "POST" }),

  // Leaderboard
  getLeaderboard: (page = 1, period = "all") =>
    apiFetch(`/api/leaderboard?page=${page}&period=${period}`),
  getMyRank: () => apiFetch("/api/leaderboard/my-rank"),
  getLeagues: () => apiFetch("/api/leaderboard/leagues"),

  // Admin
  adminGetUsers: (page = 1, search = "") =>
    apiFetch(`/api/admin/users?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  adminGetUserWallet: (userId: string) => apiFetch(`/api/admin/users/${userId}/wallet`),
  adminAdjustWallet: (userId: string, amount: number, reason: string) =>
    apiFetch(`/api/admin/users/${userId}/adjust-wallet`, { method: "POST", body: JSON.stringify({ amount, reason }) }),
  adminSuspendUser: (userId: string, suspended: boolean) =>
    apiFetch(`/api/admin/users/${userId}/suspend`, { method: "POST", body: JSON.stringify({ suspended }) }),
  adminGetDisputedMatches: () => apiFetch("/api/admin/matches/disputed"),
  adminGetStats: () => apiFetch("/api/admin/stats"),
};
