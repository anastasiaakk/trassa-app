/** Дублирует правила фронта (`src/utils/passwordPolicy.ts`), чтобы сервер не зависел от сборки клиента. */

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
