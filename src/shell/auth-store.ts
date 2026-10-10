import { signal } from "@preact/signals";
import { api, setToken, clearToken, getToken } from "./api";

export interface AuthUser {
  id: string;
  username: string;
  is_admin: boolean;
  available_balance?: number;
  reserved_balance?: number;
}

export const currentUser = signal<AuthUser | null>(null);
export const authLoading = signal(true);

export async function loadCurrentUser() {
  if (!getToken()) {
    currentUser.value = null;
    authLoading.value = false;
    return;
  }
  try {
    const user = await api.me();
    currentUser.value = user;
  } catch {
    currentUser.value = null;
    clearToken();
  }
  authLoading.value = false;
}

export async function login(username: string, password: string) {
  const result = await api.login(username, password);
  setToken(result.token);
  await loadCurrentUser();
}

export async function register(username: string, email: string, password: string) {
  const result = await api.register(username, email, password);
  setToken(result.token);
  await loadCurrentUser();
}

export async function logout() {
  await api.logout();
  clearToken();
  currentUser.value = null;
}

// Load on module import
loadCurrentUser();
