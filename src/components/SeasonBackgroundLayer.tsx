import { memo, useEffect, useState } from "react";
import FallingAppleLeaves from "./FallingAppleLeaves";
import {
  loadSeasonBackground,
  type SeasonMode,
} from "../utils/seasonBackground";

function isActiveSeason(m: SeasonMode): m is Exclude<SeasonMode, "off"> {
  return m !== "off";
}

function SeasonBackgroundLayerInner() {
  const [mode, setMode] = useState<SeasonMode>(loadSeasonBackground);

  useEffect(() => {
    const onChange = () => setMode(loadSeasonBackground());
    window.addEventListener("trassa-season-bg-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("trassa-season-bg-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  if (!isActiveSeason(mode)) {
    return null;
  }

  return <FallingAppleLeaves season={mode} />;
}

export default memo(SeasonBackgroundLayerInner);
