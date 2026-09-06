import { Prisma } from "@prisma/client";

export const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} satisfies Prisma.UserSelect;

export const refundInclude = {
  createdBy: { select: userSummarySelect },
} satisfies Prisma.RefundInclude;

/** Refunds are ordered oldest-first so the list reads as a history. */
export const refundsForExpense = {
  include: refundInclude,
  orderBy: { createdAt: "asc" },
} satisfies Prisma.Expense$refundsArgs;

/**
 * The shape every expense endpoint returns. Kept in one place so `refunds` is
 * never accidentally omitted from a response the client uses for net-of-refund
 * totals.
 */
export const expenseInclude = {
  payee: true,
  envelope: true,
  createdBy: { select: userSummarySelect },
  refunds: refundsForExpense,
} satisfies Prisma.ExpenseInclude;
