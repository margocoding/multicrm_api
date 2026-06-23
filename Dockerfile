# syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# =========================
# Dependencies
# =========================
FROM base AS deps

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# =========================
# Builder
# =========================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Генерация Prisma Client
RUN npx prisma generate

# Сборка NestJS
RUN npm run build

# =========================
# Production
# =========================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Создаём непривилегированного пользователя
RUN addgroup -S nestjs && adduser -S nestjs -G nestjs

COPY package*.json ./

# Устанавливаем только production зависимости + Prisma
RUN npm ci --omit=dev --include=prisma && npm cache clean --force

# Копируем собранное приложение
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist

# Prisma файлы (очень важно для migrate deploy)
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nestjs /app/prisma.config.ts ./prisma.config.ts

# Если у тебя есть папка generated (некоторые используют)
# COPY --from=builder --chown=nestjs:nestjs /app/generated ./generated

USER nestjs

EXPOSE 4000

# Запуск миграций + приложение
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]