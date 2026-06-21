/*
  Warnings:

  - You are about to drop the column `externalId` on the `Product` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Product_externalId_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "externalId";
