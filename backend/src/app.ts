import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authMiddleware } from "./middleware/authMiddleware";
import { apiRouter } from "./routes";
import { authRoute } from "./routes/authRoute";
import { healthRoute } from "./routes/healthRoute";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFound";
import { requestLogger } from "./middleware/requestLogger";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.use("/api/health", healthRoute);
  app.use("/api/auth", authRoute);
  app.use("/api", authMiddleware, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
