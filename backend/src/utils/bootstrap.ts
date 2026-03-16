import { execSync } from "node:child_process";
import { logger } from "../lib/logger";
import { startServer } from "../server";
import { waitForDatabase } from "./waitForDatabase";

async function bootstrap() {
  await waitForDatabase();

  logger.info({ msg: "开始同步数据库结构" });
  execSync("npx prisma db push", { stdio: "inherit" });

  logger.info({ msg: "开始写入初始化数据" });
  execSync("npx prisma db seed", { stdio: "inherit" });

  startServer();
}

bootstrap().catch((err) => {
  logger.error({ msg: "服务启动失败", err });
  process.exit(1);
});
