/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_CHAT_URL?: string;
  /** `true` — вход/регистрация через сервер (`/api/auth`), JWT в httpOnly cookie */
  readonly VITE_USE_AUTH_API?: string;
  /** Базовый URL API (по умолчанию пусто — тот же origin, прокси Vite на порт сервера) */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
