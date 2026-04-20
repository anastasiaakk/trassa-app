import "dotenv/config";
import "./bootstrapEnv.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./routes/auth.js";

const PORT = Number(process.env.PORT) || 4000;
/** По умолчанию только localhost; для доступа из сети задайте LISTEN_HOST=0.0.0.0 (см. DEPLOY.md). */
const LISTEN_HOST = process.env.LISTEN_HOST || "127.0.0.1";
/** Vite может занять 5174, если 5173 занят — разрешаем оба localhost и 127.0.0.1 */
const CORS_ORIGIN =
  process.env.CORS_ORIGIN ||
  "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174";

const app = express();
app.set("trust proxy", process.env.TRUST_PROXY === "1" ? 1 : false);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const allowedOrigins = CORS_ORIGIN.split(",").map((s) => s.trim());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === "null") {
        callback(null, true);
        return;
      }
      if (origin.startsWith("file:")) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Слишком много попыток. Подождите немного." },
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "trassa-api" });
});

app.use("/api/auth", authLimiter, authRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.listen(PORT, LISTEN_HOST, () => {
  const hint =
    LISTEN_HOST === "0.0.0.0" || LISTEN_HOST === "::"
      ? " (доступен по IP машины; за прокси обычно LISTEN_HOST=127.0.0.1)"
      : "";
  console.log(`Trassa API listening on http://${LISTEN_HOST}:${PORT}${hint}`);
  console.log(`CORS origin(s): ${CORS_ORIGIN}`);
});
