import { memo } from "react";

type Props = {
  size?: number;
  /** Цвет линий (stroke), например из темы кабинета */
  color?: string;
};

/** Иконка «Главная» в виде домика — для сайдбара и герой-кнопки кабинетов */
function CabinetHomeIcon({ size = 22, color = "currentColor" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 11 12 4l8 7v9H15v-6H9v6H4V11z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default memo(CabinetHomeIcon);
