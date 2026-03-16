import { FireEventStatus, FireIntensity, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/httpError";

export interface FireEventQuery {
  page: number;
  pageSize: number;
  status?: FireEventStatus;
  intensity?: FireIntensity;
}

export async function getFireEvents(query: FireEventQuery) {
  const where: Prisma.FireEventWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.intensity ? { fireIntensity: query.intensity } : {})
  };

  const [total, items] = await Promise.all([
    prisma.fireEvent.count({ where }),
    prisma.fireEvent.findMany({
      where,
      orderBy: { eventTime: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    })
  ]);

  return { total, items };
}

export async function createFireEvent(data: {
  eventTime: Date;
  locationX: number;
  locationY: number;
  locationZ: number;
  fireIntensity: FireIntensity;
  sensorData: Prisma.InputJsonValue;
  actionTaken?: string;
  status?: FireEventStatus;
}) {
  const created = await prisma.fireEvent.create({
    data: {
      ...data,
      status: data.status ?? FireEventStatus.detected
    }
  });

  await prisma.operationLog.create({
    data: {
      eventType: "fire_event_created",
      description: `新增火情事件 #${created.id}，火势等级：${created.fireIntensity}`,
      fireEventId: created.id
    }
  });

  return created;
}

export async function updateFireEventStatus(id: number, status: FireEventStatus, actionTaken?: string) {
  const existing = await prisma.fireEvent.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "火情事件不存在");
  }

  const updated = await prisma.fireEvent.update({
    where: { id },
    data: {
      status,
      actionTaken
    }
  });

  await prisma.operationLog.create({
    data: {
      eventType: "fire_event_status_updated",
      description: `火情事件 #${id} 状态更新为 ${status}`,
      fireEventId: id
    }
  });

  return updated;
}

export async function deleteFireEvent(id: number) {
  const existing = await prisma.fireEvent.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "火情事件不存在");
  }

  await prisma.operationLog.create({
    data: {
      eventType: "fire_event_deleted",
      description: `删除火情事件 #${id}`,
      fireEventId: id
    }
  });

  await prisma.fireEvent.delete({ where: { id } });
}
