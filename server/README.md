# API сервера ТрассА

Node.js **22.13+** (Express) + SQLite через встроенный модуль **`node:sqlite`** (без отдельной сборки под версию Node) + JWT в **httpOnly cookie** + bcrypt.

При старте Node может вывести предупреждение *ExperimentalWarning: SQLite* — это нормально для встроенного API.

## Безопасность

- **Helmet** — заголовки ответа.
- **CORS** — только указанные источники (`CORS_ORIGIN`), `credentials: true`.
- **express-rate-limit** — лимит запросов к `/api/auth/*`.
- **Пароль** — bcrypt (cost 12), на сервере те же правила сложности, что на клиенте.
- **JWT** — срок 7 дней, cookie `trassa_access`, `SameSite=Lax`, в production включается `Secure`.
- **В production** обязательно задайте `JWT_SECRET` (≥32 символов) в `.env`.

## Запуск

```bash
cd server
npm install
cp .env.example .env   # отредактируйте JWT_SECRET для своей среды
npm run dev
```

По умолчанию API слушает **`127.0.0.1:4000`** (только с этой машины). Для публикации в интернете см. **`../DEPLOY.md`**. База: `server/data/app.db` (создаётся автоматически).

## Вместе с фронтендом

1. В корне приложения создайте `.env` (см. `../.env.example`): `VITE_USE_AUTH_API=true`.
2. Запустите API (команда выше).
3. Запустите Vite: `npm run dev` из корня `my-react-app` — прокси пересылает `/api` на порт 4000.

Эндпоинты: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/profile`, `GET /api/health`.
