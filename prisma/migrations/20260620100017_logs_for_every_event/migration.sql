-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "type" "LogType" NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);
