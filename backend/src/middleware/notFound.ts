import { Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    message: "接口不存在",
    path: req.originalUrl
  });
}
