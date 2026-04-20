/**
 * Требования к паролю: ≥8 символов, латиница и цифры (только [a-zA-Z0-9]).
 */

export const PASSWORD_RULES_SHORT =
  "Не менее 8 символов: только латинские буквы (a–z, A–Z) и цифры (0–9).";

/** null = ок, иначе текст ошибки для пользователя */
export function validatePasswordPolicy(password: string): string | null {
  const p = password;
  if (p.length < 8) {
    return "Пароль должен быть не короче 8 символов.";
  }
  if (!/^[a-zA-Z0-9]+$/.test(p)) {
    return "Пароль может содержать только латинские буквы и цифры, без пробелов и других символов.";
  }
  if (!/[a-zA-Z]/.test(p)) {
    return "Пароль должен содержать хотя бы одну латинскую букву.";
  }
  if (!/[0-9]/.test(p)) {
    return "Пароль должен содержать хотя бы одну цифру.";
  }
  return null;
}
