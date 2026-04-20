import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EntrySplash from "../components/EntrySplash";
import Page1 from "./Page1";
import {
  ENTRY_SPLASH_DURATION_MS,
  PAGE1_VISIBLE_AFTER_SPLASH_MS,
} from "../introFlow";
import { PAGE1_SURFACE_STYLE } from "../page1SurfaceStyle";
import { prefetchServicesRoute } from "../utils/routePrefetch";

type Phase = "splash" | "page1";

/**
 * Сначала только сплэш, затем монтируется страница 1 (иначе она остаётся под z-index сплэша
 * и таймеры считаются «с нуля», пока экран ещё закрыт).
 */
export default function Page1Flow() {
  const [phase, setPhase] = useState<Phase>("splash");
  const navigate = useNavigate();

  useEffect(() => {
    prefetchServicesRoute();
    const t = window.setTimeout(() => setPhase("page1"), ENTRY_SPLASH_DURATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "page1") return;
    const t = window.setTimeout(() => {
      navigate("/services");
    }, PAGE1_VISIBLE_AFTER_SPLASH_MS);
    return () => window.clearTimeout(t);
  }, [phase, navigate]);

  return (
    <div className="page1-flow-bg" style={PAGE1_SURFACE_STYLE}>
      {phase === "splash" && <EntrySplash />}
      {phase === "page1" && <Page1 />}
    </div>
  );
}
