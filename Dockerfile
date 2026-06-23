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
# Build
# =========================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Генерация Prisma Client
RUN npx prisma migrate deploy
RUN npx prisma generate

# Сборка NestJS
RUN npm run build

# =========================
# Production
# =========================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S nestjs && adduser -S nestjs -G nestjs

COPY package*.json ./

# Только production зависимости
RUN npm ci --omit=dev && npm cache clean --force

# Собранный NestJS
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist

# Prisma schema
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma

# Prisma generated client
COPY --from=builder --chown=nestjs:nestjs /app/generated ./generated

USER nestjs

EXPOSE 4000

CMD ["node", "dist/src/main"]