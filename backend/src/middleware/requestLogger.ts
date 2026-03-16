import { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startAt = Date.now();
  res.on("finish", () => {
    logger.info({
      msg: "请求完成",
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startAt,
      ip: req.ip
    });
  });
  next();
}
