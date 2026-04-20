import { memo } from "react";
import CabinetLearnerHome from "./CabinetLearnerHome";

/** Личный кабинет: роль «Студент» (СПО и ВО) */
const CabinetSpo = () => <CabinetLearnerHome variant="spo" />;

export default memo(CabinetSpo);
