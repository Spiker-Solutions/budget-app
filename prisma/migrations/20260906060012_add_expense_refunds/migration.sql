-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "expenseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Refund_expenseId_idx" ON "Refund"("expenseId");

-- CreateIndex
CREATE INDEX "Refund_date_idx" ON "Refund"("date");

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A refund always moves money back, so the amount must be strictly positive.
-- The "refunds must not exceed the expense" rule spans sibling rows and is
-- enforced transactionally in the API instead.
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0);
