import { memo } from "react";
import { AssociationPage } from "./Page5";

/** Тот же интерфейс, что страница 5, вариант для АДО вместо РАДОР */
function Page6() {
  return <AssociationPage variant="ado" />;
}

export default memo(Page6);
