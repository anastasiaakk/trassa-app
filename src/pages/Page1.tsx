import { FunctionComponent, useEffect, useState } from "react";
import { PAGE1_SURFACE_STYLE } from "../page1SurfaceStyle";
import { publicUrl } from "../utils/publicUrl";
import styles from "./Page1.module.css";

const Page1: FunctionComponent = () => {
  const [visibleCards, setVisibleCards] = useState([false, false, false, false]);

  useEffect(() => {
    const startDelayMs = 1450;
    const stepMs = 500;
    const timers = [0, 1, 2, 3].map((index) =>
      window.setTimeout(() => {
        setVisibleCards((prev) => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }, startDelayMs + index * stepMs)
    );

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  return (
    <div
      className={`page1-screen-bg ${styles.v2534_3986}`}
      style={PAGE1_SURFACE_STYLE}
    >
      <div className={styles.page1Content}>
        <div className={styles.logoTop} aria-hidden="true">
          <img className={styles.logoImg} src={publicUrl("Vector.svg")} alt="" decoding="async" fetchPriority="high" />
        </div>
        <div className={styles.v2721_111}>
          <div className={styles.v2703_3927} />
          <div className={styles.v2699_276} />
        </div>
        <div className={styles.v2659_113}>
          <div className={styles.v2534_3991} />
          <span className={styles.v2534_3994}>
            ТрассА - комплексный портал для управления персоналом, развития лучших практик в дорожной деятельности
          </span>
          <div className={styles.v2534_3992} />
          <span className={styles.v2534_3993}>Новое поколение управления кадрами</span>
        </div>
        <div className={styles.v2548_4525}>
          <div
            className={`${styles.v2548_4526} ${styles.card} ${visibleCards[0] ? styles.cardShown : styles.cardHidden}`}
          >
            <div className={styles.v2534_4005} />
            <span className={styles.v2534_4006}>63+</span>
            <span className={styles.v2534_4007}>
              Региональных
              <br />
              заявок
            </span>
          </div>
          <div
            className={`${styles.v2548_4527} ${styles.card} ${visibleCards[1] ? styles.cardShown : styles.cardHidden}`}
          >
            <div className={styles.v2534_4008} />
            <span className={styles.v2534_4009}>Много</span>
            <span className={styles.v2534_4010}>Специалистов</span>
          </div>
          <div
            className={`${styles.v2718_3872} ${styles.card} ${visibleCards[2] ? styles.cardShown : styles.cardHidden}`}
          >
            <div className={styles.v2534_4011} />
            <span className={styles.v2534_4012}>99,95%</span>
            <span className={styles.v2534_4013}>Заинтересованность</span>
          </div>
          <div
            className={`${styles.v2548_4524} ${styles.card} ${visibleCards[3] ? styles.cardShown : styles.cardHidden}`}
          >
            <div className={styles.v2534_4014} />
            <span className={styles.v2534_4015}>24/7</span>
            <span className={styles.v2534_4016}>Поддержка</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page1;
