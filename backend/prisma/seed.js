const bcrypt = require("bcryptjs");
const { FireEventStatus, FireIntensity, PrismaClient, RobotWorkStatus } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedFireEvents() {
  const existingCount = await prisma.fireEvent.count();
  if (existingCount > 0) {
    return;
  }

  const now = new Date();
  await prisma.fireEvent.createMany({
    data: [
      {
        eventTime: new Date(now.getTime() - 10 * 60 * 1000),
        locationX: 12.3,
        locationY: 4.8,
        locationZ: 0.5,
        fireIntensity: FireIntensity.low,
        sensorData: { temperature: 78, smoke: 22, co: 12 },
        actionTaken: "云台初步对准并预警",
        status: FireEventStatus.detected
      },
      {
        eventTime: new Date(now.getTime() - 40 * 60 * 1000),
        locationX: 7.1,
        locationY: 3.2,
        locationZ: 0.3,
        fireIntensity: FireIntensity.medium,
        sensorData: { temperature: 162, smoke: 58, co: 38 },
        actionTaken: "喷雾模式灭火完成",
        status: FireEventStatus.extinguished
      },
      {
        eventTime: new Date(now.getTime() - 90 * 60 * 1000),
        locationX: 2.5,
        locationY: 8.4,
        locationZ: 0.9,
        fireIntensity: FireIntensity.high,
        sensorData: { temperature: 260, smoke: 81, co: 63 },
        actionTaken: "干粉模式执行中",
        status: FireEventStatus.detected
      }
    ]
  });
}

async function seedRobotStatus() {
  const robots = [
    {
      robotId: "RBT-01",
      positionX: 3.2,
      positionY: 5.6,
      orientation: 90,
      batteryLevel: 84,
      status: RobotWorkStatus.working
    },
    {
      robotId: "RBT-02",
      positionX: 1.5,
      positionY: 2.2,
      orientation: 45,
      batteryLevel: 61,
      status: RobotWorkStatus.moving
    }
  ];

  for (const robot of robots) {
    await prisma.robotStatus.upsert({
      where: { robotId: robot.robotId },
      update: robot,
      create: robot
    });
  }
}

async function seedOperationLogs() {
  const existingCount = await prisma.operationLog.count();
  if (existingCount > 0) {
    return;
  }

  await prisma.operationLog.createMany({
    data: [
      { eventType: "system_boot", description: "系统初始化完成" },
      { eventType: "sensor_ready", description: "多源传感器接入成功" },
      { eventType: "model_ready", description: "火情识别模型加载完成" }
    ]
  });
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash("123456", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash, role: "admin" },
    create: {
      username: "admin",
      passwordHash,
      role: "admin"
    }
  });
}

async function main() {
  await seedFireEvents();
  await seedRobotStatus();
  await seedOperationLogs();
  await seedUsers();
}

main()
  .catch(async (err) => {
    await prisma.$disconnect();
    throw err;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
