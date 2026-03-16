export const config = {
  port: Number(process.env.PORT ?? 8000),
  databaseUrl: process.env.DATABASE_URL ?? "mysql://root:root@db:3306/fire_control",
  logLevel: process.env.LOG_LEVEL ?? "info",
  jwtSecret: process.env.JWT_SECRET ?? "fire_control_secret"
};
