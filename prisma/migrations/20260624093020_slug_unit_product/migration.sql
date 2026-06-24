/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "condition" "ProductCondition" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'единица';

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
