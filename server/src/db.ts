import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Десктоп: БД в %AppData% (Electron), а не в Program Files. */
const dataDir = process.env.TRASSA_DATA_DIR?.trim()
  ? path.resolve(process.env.TRASSA_DATA_DIR)
  : path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.db");

/** Встроенный SQLite (Node 22.13+), без нативного addon — нет конфликтов версий Node. */
export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email_norm TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    profile_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export type UserRow = {
  id: string;
  email_norm: string;
  password_hash: string;
  profile_json: string;
  created_at: string;
};
