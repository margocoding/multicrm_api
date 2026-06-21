FROM node AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npm install -g @nestjs/cli

FROM deps AS prisma-gen
RUN npx prisma generate

FROM prisma-gen AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Копируем собранный код и Prisma
COPY --from=builder /app/dist ./dist
COPY --from=prisma-gen /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma-gen /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main"]