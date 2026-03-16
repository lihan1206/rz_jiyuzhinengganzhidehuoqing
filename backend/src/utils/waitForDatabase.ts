import mysql from "mysql2/promise";
import { config } from "../config";
import { logger } from "../lib/logger";

function getConnectionOptions() {
  const url = new URL(config.databaseUrl);
  return {
    host: url.hostname,
    port: Number(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.replace("/", "")
  };
}

export async function waitForDatabase(maxRetries = 30, delayMs = 2000) {
  const options = getConnectionOptions();
  for (let i = 1; i <= maxRetries; i += 1) {
    try {
      const conn = await mysql.createConnection(options);
      await conn.query("SELECT 1");
      await conn.end();
      logger.info({ msg: "数据库连接就绪" });
      return;
    } catch (err) {
      logger.warn({ msg: "等待数据库可用", retry: i, maxRetries, err });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("数据库在限定时间内未就绪");
}
