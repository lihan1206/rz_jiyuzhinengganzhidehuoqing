FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run db:generate
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/dist ./dist
EXPOSE 8000
CMD ["npm", "run", "start:prod"]
