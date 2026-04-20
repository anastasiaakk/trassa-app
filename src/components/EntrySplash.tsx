import { useEffect, useState } from "react";
import { ENTRY_SPLASH_DURATION_MS } from "../introFlow";
import { publicUrl } from "../utils/publicUrl";

type EntrySplashProps = {
  durationMs?: number;
};

export default function EntrySplash({
  durationMs = ENTRY_SPLASH_DURATION_MS,
}: EntrySplashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs]);

  if (!visible) return null;

  return (
    <div className="entry-splash" role="status" aria-label="Загрузка приложения">
      <div className="entry-splash__bg" aria-hidden="true" />
      <div className="entry-splash__card">
        <div className="entry-splash__logoWrap" aria-hidden="true">
          <img className="entry-splash__logo" src={publicUrl("Vector.svg")} alt="" decoding="async" fetchPriority="high" />
        </div>
        <div className="entry-splash__content">
          <div className="entry-splash__title">ТрассА</div>
          <div className="entry-splash__subtitle">входим в приложение…</div>
          <div className="entry-splash__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}

