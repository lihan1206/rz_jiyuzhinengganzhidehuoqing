import { Router } from "express";
import { z } from "zod";
import { listOperationLogs } from "../services/operationLogService";

export const operationLogRoute = Router();

operationLogRoute.get("/", async (req, res, next) => {
  try {
    const limit = z.coerce.number().int().min(1).max(200).default(50).parse(req.query.limit);
    const data = await listOperationLogs(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
