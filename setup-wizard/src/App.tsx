import { useEffect, useState } from "react";

type Step = "welcome" | "progress" | "done";

export function App() {
  const [step, setStep] = useState<Step>("welcome");
  const [dest, setDest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [exePath, setExePath] = useState("");

  useEffect(() => {
    void window.trassaSetup.defaultPath().then(setDest);
  }, []);

  const pick = async () => {
    const p = await window.trassaSetup.pickFolder();
    if (p) setDest(p);
  };

  const runInstall = async () => {
    if (!dest.trim()) {
      setError("Укажите папку установки.");
      return;
    }
    setError(null);
    setStep("progress");
    setProgress(12);
    await new Promise((r) => setTimeout(r, 180));
    setProgress(40);
    const r = await window.trassaSetup.install(dest.trim());
    setProgress(100);
    await new Promise((res) => setTimeout(res, 280));
    if (!r.ok) {
      setError(r.error ?? "Не удалось установить.");
      setStep("welcome");
      return;
    }
    setExePath(r.exePath ?? "");
    setStep("done");
  };

  return (
    <div className="neo-root">
      <div className="neo-panel">
        <div className="neo-logo" aria-hidden>
          Т
        </div>
        <h1 className="neo-title">Трасса Setup</h1>
        <p className="neo-sub">
          Установка приложения «Трасса» на этот компьютер. Файлы копируются локально, без классического
          мастера NSIS — интерфейс в неоморфном стиле.
        </p>

        {step === "welcome" && (
          <>
            <label className="neo-label">Папка установки</label>
            <div className="neo-path-row">
              <input className="neo-input" readOnly value={dest} title={dest} />
              <button type="button" className="neo-btn" onClick={() => void pick()}>
                Обзор…
              </button>
            </div>
            {error ? <div className="neo-error">{error}</div> : null}
            <button type="button" className="neo-btn neo-btn--primary" onClick={() => void runInstall()}>
              Установить
            </button>
          </>
        )}

        {step === "progress" && (
          <>
            <p className="neo-sub" style={{ marginBottom: 8 }}>
              Копирование файлов…
            </p>
            <div className="neo-progress">
              <div className="neo-progress__bar" style={{ width: `${progress}%` }} />
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <p className="neo-sub" style={{ marginBottom: 16 }}>
              Готово. Приложение установлено. На рабочем столе можно создать ярлык «Трасса» (если сработала
              политика PowerShell).
            </p>
            <div className="neo-actions">
              <button
                type="button"
                className="neo-btn neo-btn--primary"
                onClick={() => void window.trassaSetup.openExe(exePath)}
              >
                Запустить «Трасса»
              </button>
              <button
                type="button"
                className="neo-btn"
                onClick={() => void window.trassaSetup.openFolder(dest)}
              >
                Открыть папку
              </button>
              <button type="button" className="neo-btn neo-btn--ghost" onClick={() => window.trassaSetup.quit()}>
                Закрыть установщик
              </button>
            </div>
          </>
        )}
      </div>
      <p className="neo-footer">Версия 0.1.0 · портал «Трасса»</p>
    </div>
  );
}
