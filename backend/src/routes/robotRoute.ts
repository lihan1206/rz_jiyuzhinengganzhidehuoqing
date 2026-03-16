import { RobotWorkStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { listRobotStatus, upsertRobotStatus } from "../services/robotService";

export const robotRoute = Router();

const upsertSchema = z.object({
  positionX: z.number(),
  positionY: z.number(),
  orientation: z.number(),
  batteryLevel: z.number().int().min(0).max(100),
  status: z.nativeEnum(RobotWorkStatus)
});

robotRoute.get("/", async (_req, res, next) => {
  try {
    const data = await listRobotStatus();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

robotRoute.put("/:robotId", async (req, res, next) => {
  try {
    const robotId = z.string().min(1).max(50).parse(req.params.robotId);
    const payload = upsertSchema.parse(req.body);
    const updated = await upsertRobotStatus(robotId, payload);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
