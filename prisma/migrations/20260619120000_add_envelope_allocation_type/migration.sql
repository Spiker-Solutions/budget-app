-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('AMOUNT', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "Envelope" ADD COLUMN "allocationType" "AllocationType" NOT NULL DEFAULT 'AMOUNT';
