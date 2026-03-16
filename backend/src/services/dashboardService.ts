import { FireEventStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function getOverview() {
  const [totalFires, activeFires, extinguishedFires, totalRobots, latestLogs] = await Promise.all([
    prisma.fireEvent.count(),
    prisma.fireEvent.count({ where: { status: FireEventStatus.detected } }),
    prisma.fireEvent.count({ where: { status: FireEventStatus.extinguished } }),
    prisma.robotStatus.count(),
    prisma.operationLog.findMany({ orderBy: { timestamp: "desc" }, take: 8 })
  ]);

  return {
    totalFires,
    activeFires,
    extinguishedFires,
    totalRobots,
    latestLogs
  };
}
