import { memo } from "react";
import styles from "./DesktopDownloadPanel.module.css";
import { publicUrl } from "../utils/publicUrl";

/** Имя файла в public/downloads/ и dist/downloads/ (копируется scripts/sync-setup-download.cjs). */
const SETUP_FILE = "downloads/trassa-setup.exe";

type Props = {
  /** Узкая вёрстка внутри модального окна на /services */
  embedded?: boolean;
};

function DesktopDownloadPanel({ embedded }: Props) {
  const href = publicUrl(SETUP_FILE);

  return (
    <div className={embedded ? styles.embedded : styles.standalone}>
      <h2 className={styles.title} id="about-dialog-download-heading">
        Приложение для компьютера (Windows)
      </h2>
      <p className={styles.lead}>
        Портал «ТрассА» можно открывать в браузере. Если удобнее отдельное окно на рабочем столе — скачайте и
        запустите установщик.
      </p>
      <div className={styles.downloadBlock}>
        <a className={styles.downloadBtn} href={href} download="Трасса-Setup.exe">
          Скачать
        </a>
        <p className={styles.downloadHint}>Файл: установщик Windows (.exe)</p>
      </div>
    </div>
  );
}

export default memo(DesktopDownloadPanel);
