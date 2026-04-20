import { FormEvent, useCallback, useState } from "react";
import { getBuiltinAdminHints, loginAdmin } from "../utils/adminAuth";
import styles from "./AdminPanel.module.css";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
  /** Общий «милый» фон на странице (Page2) — без дублирующей заливки .cabinetBg */
  useParentPageBackground?: boolean;
};

export default function AdminLoginPanel({
  onSuccess,
  onCancel,
  useParentPageBackground = false,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hints = getBuiltinAdminHints();

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setBusy(true);
      try {
        const ok = await loginAdmin(email, password);
        if (ok) {
          onSuccess();
        } else {
          setError("Неверный логин или пароль.");
        }
      } finally {
        setBusy(false);
      }
    },
    [email, onSuccess, password]
  );

  return (
    <div
      className={`${styles.cabinetPage} ${styles.themeLogin} ${useParentPageBackground ? styles.cabinetPageEmbed : ""}`}
    >
      <div
        className={`${styles.cabinetBg} ${useParentPageBackground ? styles.cabinetBgTransparent : ""}`}
        aria-hidden
      />

      <div className={styles.loginShell}>
        <div className={`${styles.neoCard} ${styles.loginCard}`}>
          <p className={styles.cabinetKicker}>Администраторам</p>
          <h2 className={styles.loginTitle}>Вход в личный кабинет</h2>
          <p className={styles.loginLead}>
            Добро пожаловать. Сессия действует до закрытия вкладки.
          </p>

          <div className={styles.hintNeo}>
            <span className={styles.hintNeoLabel}>Тестовые учётные записи</span>
            <ul className={styles.hintList}>
              {hints.map((h) => (
                <li key={h.email}>
                  <strong>{h.name}</strong>
                  <span className={styles.hintCreds}>
                    {h.email} · {h.password}
                  </span>
                </li>
              ))}
            </ul>
            <span className={styles.hintNeoFoot}>
              После входа рекомендуется сменить пароль в настройках кабинета.
            </span>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.label}>
              Электронная почта
              <input
                className={styles.inputNeo}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ksenia@trassa.local"
                required
              />
            </label>
            <label className={styles.label}>
              Пароль
              <input
                className={styles.inputNeo}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.rowBtns}>
              <button type="submit" className={styles.btnNeoPrimary} disabled={busy}>
                {busy ? "Вход…" : "Войти"}
              </button>
              <button type="button" className={styles.btnNeoGhost} onClick={onCancel}>
                К карте
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
