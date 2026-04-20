import { FunctionComponent, useMemo, type CSSProperties } from "react";
import styles from "./GroupComponent.module.css";

export type GroupComponentType = {
  className?: string;
  frame?: string;
  prop?: string;
  prop1?: string;

  /** Style props */
  groupDivPadding?: CSSProperties["padding"];
  divWidth?: CSSProperties["width"];
};

const GroupComponent: FunctionComponent<GroupComponentType> = ({
  className = "",
  frame,
  prop,
  prop1,
  groupDivPadding,
  divWidth,
}) => {
  const groupDivStyle: CSSProperties = useMemo(() => {
    return {
      padding: groupDivPadding,
    };
  }, [groupDivPadding]);

  const divStyle: CSSProperties = useMemo(() => {
    return {
      width: divWidth,
    };
  }, [divWidth]);

  return (
    <div
      className={[styles.rectangleParent, className].join(" ")}
      style={groupDivStyle}
    >
      <div className={styles.rectangle} />
      <div className={styles.rectangle2} />
      <div className={styles.rectangleGroup}>
        <div className={styles.rectangle3} />
        <img className={styles.frameIcon} alt="" src={frame} />
      </div>
      <div className={styles.div}>{prop}</div>
      <div className={styles.div2} style={divStyle}>
        {prop1}
      </div>
    </div>
  );
};

export default GroupComponent;
