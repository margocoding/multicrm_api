/*
  Warnings:

  - You are about to drop the column `category` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Product` table. All the data in the column will be lost.
  - Added the required column `name` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceUnit` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "category",
DROP COLUMN "description",
DROP COLUMN "title",
ADD COLUMN     "length" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "priceUnit" TEXT NOT NULL,
ADD COLUMN     "standard" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'IN STOCK',
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "weight" TEXT,
ALTER COLUMN "price" SET DATA TYPE TEXT;
