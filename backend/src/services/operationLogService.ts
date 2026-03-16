import { prisma } from "../lib/prisma";

export async function listOperationLogs(limit: number) {
  return prisma.operationLog.findMany({
    orderBy: { timestamp: "desc" },
    take: limit
  });
}
