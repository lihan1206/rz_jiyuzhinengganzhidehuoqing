import { Router } from "express";
import { getOverview } from "../services/dashboardService";

export const dashboardRoute = Router();

dashboardRoute.get("/overview", async (_req, res, next) => {
  try {
    const data = await getOverview();
    res.json(data);
  } catch (err) {
    next(err);
  }
});
