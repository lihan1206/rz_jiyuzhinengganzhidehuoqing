import { FireEventStatus, FireIntensity } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  createFireEvent,
  deleteFireEvent,
  getFireEvents,
  updateFireEventStatus
} from "../services/fireEventService";

export const fireEventRoute = Router();

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.nativeEnum(FireEventStatus).optional(),
  intensity: z.nativeEnum(FireIntensity).optional()
});

const createSchema = z.object({
  eventTime: z.coerce.date(),
  locationX: z.number(),
  locationY: z.number(),
  locationZ: z.number(),
  fireIntensity: z.nativeEnum(FireIntensity),
  sensorData: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  actionTaken: z.string().max(100).optional(),
  status: z.nativeEnum(FireEventStatus).optional()
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(FireEventStatus),
  actionTaken: z.string().max(100).optional()
});

fireEventRoute.get("/", async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const data = await getFireEvents(query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

fireEventRoute.post("/", async (req, res, next) => {
  try {
    const payload = createSchema.parse(req.body);
    const created = await createFireEvent(payload);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

fireEventRoute.patch("/:id/status", async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const payload = updateStatusSchema.parse(req.body);
    const updated = await updateFireEventStatus(id, payload.status, payload.actionTaken);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

fireEventRoute.delete("/:id", async (req, res, next) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    await deleteFireEvent(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
