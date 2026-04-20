/** Выполняется до остальных модулей: секрет для JWT в разработке. */
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: set JWT_SECRET in the environment for production.");
    process.exit(1);
  }
  process.env.JWT_SECRET =
    "dev-only-trassa-jwt-secret-minimum-32-characters-do-not-use-prod";
  console.warn("[trassa-server] JWT_SECRET not set — using insecure development default.");
}
