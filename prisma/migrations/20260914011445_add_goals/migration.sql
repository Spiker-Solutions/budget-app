-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('SAVE', 'DEBT');

-- CreateEnum
CREATE TYPE "RemainderWizardStatus" AS ENUM ('PENDING', 'DISMISSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "goalId" TEXT;

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT DEFAULT 'teal',
    "startingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalCharge" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemainderWizardState" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "RemainderWizardStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemainderWizardState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_budgetId_idx" ON "Goal"("budgetId");

-- CreateIndex
CREATE INDEX "Goal_archivedAt_idx" ON "Goal"("archivedAt");

-- CreateIndex
CREATE INDEX "GoalCharge_goalId_date_idx" ON "GoalCharge"("goalId", "date");

-- CreateIndex
CREATE INDEX "RemainderWizardState_budgetId_status_idx" ON "RemainderWizardState"("budgetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RemainderWizardState_budgetId_periodStart_periodEnd_key" ON "RemainderWizardState"("budgetId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Expense_goalId_idx" ON "Expense"("goalId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalCharge" ADD CONSTRAINT "GoalCharge_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalCharge" ADD CONSTRAINT "GoalCharge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemainderWizardState" ADD CONSTRAINT "RemainderWizardState_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemainderWizardState" ADD CONSTRAINT "RemainderWizardState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
