# syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# 1. Установка всех зависимостей (включая dev для генерации Prisma и сборки)
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# 2. Сборка приложения и генерация Prisma Client
FROM base AS builder
WORKDIR /app
# Копируем node_modules из deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Генерируем Prisma Client (создаст папки .prisma и @prisma в node_modules)
RUN npx prisma generate

# Собираем NestJS (создаст папку dist)
RUN npm run build

# 3. Production-образ (минимальный размер)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Создаем пользователя (синтаксис для Alpine Linux)
RUN addgroup -S nestjs && adduser -S nestjs -G nestjs

# Копируем package.json и устанавливаем ТОЛЬКО production-зависимости
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Копируем сгенерированный Prisma Client из builder
COPY --from=builder --chown=nestjs:nestjs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nestjs /app/node_modules/@prisma ./node_modules/@prisma

# Копируем скомпилированный код и папку prisma (схема нужна для миграций)
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main"]