import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";
import { HttpError } from "../utils/httpError";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "请求参数校验失败",
      details: err.issues.map((issue) => issue.message)
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      message: err.message
    });
    return;
  }

  logger.error({ msg: "服务异常", err, path: req.originalUrl });
  res.status(500).json({ message: "服务器内部错误" });
}
