-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "carryOverRemainder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Envelope" ADD COLUMN     "carryOverRemainder" BOOLEAN;
