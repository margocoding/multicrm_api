-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "characteristics" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "condition" "ProductCondition" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "image" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'шт';
