import { RobotWorkStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function listRobotStatus() {
  return prisma.robotStatus.findMany({
    orderBy: { lastUpdated: "desc" }
  });
}

export async function upsertRobotStatus(
  robotId: string,
  data: {
    positionX: number;
    positionY: number;
    orientation: number;
    batteryLevel: number;
    status: RobotWorkStatus;
  }
) {
  const result = await prisma.robotStatus.upsert({
    where: { robotId },
    update: data,
    create: {
      robotId,
      ...data
    }
  });

  await prisma.operationLog.create({
    data: {
      eventType: "robot_status_updated",
      description: `机器人 ${robotId} 状态更新为 ${data.status}`,
      robotId
    }
  });

  return result;
}
