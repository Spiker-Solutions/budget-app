-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Envelope" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Budget_archivedAt_idx" ON "Budget"("archivedAt");

-- CreateIndex
CREATE INDEX "Envelope_archivedAt_idx" ON "Envelope"("archivedAt");
