# 智能感知火情自主识别与精准灭火机器人控制系统

## 🛠 技术栈
- Frontend: React 18 + Vite + Ant Design + React Query + Zod
- Backend: Node.js + Express + Prisma + Zod + Winston
- Database: MySQL 8.0

## 🚀 启动指南 (How to Run)
1. 确保 Docker Desktop 已启动。
2. 在根目录执行：`docker compose up --build`
3. 等待容器启动完成。
4. 若本机端口冲突，可执行：`FRONTEND_PORT=13000 BACKEND_PORT=18000 DB_PORT=13306 docker compose up --build`

## 🔗 服务地址 (Services)
- Frontend: http://localhost:3000
- Backend API 健康检查: http://localhost:8000/api/health
- Database: localhost:3306 (user: root / pass: root)

## 🧪 测试账号
- Admin: admin / 123456

## 📌 功能说明
- 火情事件管理：新增、筛选、状态更新、删除（带 UI 设计确认弹窗）
- 机器人状态监控：查看机器人位姿、电量、工作状态
- 运行总览：火情总数、待处置数、已扑灭数、在线机器人数量
- 操作日志：实时展示系统关键操作记录

## 🐳 Docker 镜像源配置 (Docker Registry Configuration)

### 推荐配置（基于实际项目验证）

#### 1. Docker 镜像源
使用官方 Docker Hub 镜像

#### 2. npm 依赖源
在前后端 Dockerfile 中已配置：
`RUN npm config set registry https://registry.npmmirror.com`

#### 3. 前端构建加速规范
- 已提交 `package-lock.json`
- Dockerfile 内使用 `npm ci`

### 使用建议
1. ✅ 优先使用官方镜像，稳定可靠
2. ✅ 使用多阶段构建，减小镜像体积
3. ✅ 使用 npm 镜像源，加快依赖下载
4. ✅ 统一通过 `docker compose up --build` 启动全链路
