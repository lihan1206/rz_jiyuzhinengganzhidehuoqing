import { createServer } from "node:http";
import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

export function startServer() {
  const app = createApp();
  const server = createServer(app);

  server.listen(config.port, () => {
    logger.info({ msg: "后端服务启动成功", port: config.port });
  });

  const shutdown = async () => {
    logger.info({ msg: "接收到关闭信号，正在优雅关闭" });
    await prisma.$disconnect();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}

if (require.main === module) {
  startServer();
}
