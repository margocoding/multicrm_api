/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('xml', 'json');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "externalId" TEXT;

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ImportType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'processing',
    "productsCount" INTEGER NOT NULL DEFAULT 0,
    "targetSiteIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_externalId_key" ON "Product"("externalId");
