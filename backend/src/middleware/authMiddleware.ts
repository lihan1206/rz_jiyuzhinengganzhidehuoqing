import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "未登录或登录已过期" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    jwt.verify(token, config.jwtSecret);
    next();
  } catch (_err) {
    res.status(401).json({ message: "登录凭证无效，请重新登录" });
  }
}
