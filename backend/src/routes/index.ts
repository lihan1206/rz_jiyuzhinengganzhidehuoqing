import { Router } from "express";
import { dashboardRoute } from "./dashboardRoute";
import { fireEventRoute } from "./fireEventRoute";
import { operationLogRoute } from "./operationLogRoute";
import { robotRoute } from "./robotRoute";

export const apiRouter = Router();

apiRouter.use("/dashboard", dashboardRoute);
apiRouter.use("/fire-events", fireEventRoute);
apiRouter.use("/robot-status", robotRoute);
apiRouter.use("/operation-logs", operationLogRoute);
