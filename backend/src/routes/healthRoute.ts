import { Router } from "express";

export const healthRoute = Router();

healthRoute.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "服务运行正常",
    timestamp: new Date().toISOString()
  });
});
