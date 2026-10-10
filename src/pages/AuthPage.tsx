import { useSignal } from "@preact/signals";
import { login, register } from "../shell/auth-store";
import { navigate } from "../shell/router";
import styles from "../shell/Platform.module.css";

export function AuthPage() {
  const mode = useSignal<"login" | "register">("login");
  const username = useSignal("");
  const email = useSignal("");
  const password = useSignal("");
  const error = useSignal<string | null>(null);
  const loading = useSignal(false);

  const submit = async (ev: Event) => {
    ev.preventDefault();
    error.value = null;
    loading.value = true;
    try {
      if (mode.value === "login") {
        await login(username.value, password.value);
      } else {
        await register(username.value, email.value, password.value);
      }
      navigate("/");
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  return (
    <div class={styles.authPage}>
      <div class={`${styles.card} ${styles.authCard}`}>
        <div class={styles.authTabs}>
          <button
            class={`${styles.authTab} ${mode.value === "login" ? styles.authTabActive : ""}`}
            onClick={() => (mode.value = "login")}
          >
            Entrar
          </button>
          <button
            class={`${styles.authTab} ${mode.value === "register" ? styles.authTabActive : ""}`}
            onClick={() => (mode.value = "register")}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={submit}>
          <div class={styles.formGroup}>
            <label class={styles.formLabel}>Usuário</label>
            <input
              class={styles.formInput}
              value={username.value}
              onInput={(e: any) => (username.value = e.target.value)}
              autoFocus
            />
          </div>

          {mode.value === "register" && (
            <div class={styles.formGroup}>
              <label class={styles.formLabel}>Email</label>
              <input
                class={styles.formInput}
                type="email"
                value={email.value}
                onInput={(e: any) => (email.value = e.target.value)}
              />
            </div>
          )}

          <div class={styles.formGroup}>
            <label class={styles.formLabel}>Senha</label>
            <input
              class={styles.formInput}
              type="password"
              value={password.value}
              onInput={(e: any) => (password.value = e.target.value)}
            />
          </div>

          {error.value && <div class={styles.authError}>{error.value}</div>}

          <button type="submit" class={styles.btn} disabled={loading.value} style="width: 100%; margin-top: 0.4em;">
            {loading.value ? "..." : mode.value === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p style="text-align: center; color: var(--text-muted); font-size: 0.8em; margin-top: 1em;">
          Você também pode jogar como convidado (Praticar / Computador).
        </p>
      </div>
    </div>
  );
}
