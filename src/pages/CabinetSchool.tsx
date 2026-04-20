import { memo } from "react";
import CabinetLearnerHome from "./CabinetLearnerHome";

/** Личный кабинет: роль «Школьник» */
const CabinetSchool = () => <CabinetLearnerHome variant="school" />;

export default memo(CabinetSchool);
