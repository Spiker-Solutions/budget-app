import { Prisma } from "@prisma/client";
import { fromCents, toCents } from "@/lib/refunds";
import { formatCurrency } from "@/lib/utils";

/**
 * Guards for the one refund rule that spans rows: the refunds on an expense
 * must never add up to more than the expense itself.
 *
 * Zod cannot see an incoming refund's siblings, and Postgres CHECK constraints
 * cannot span rows, so these run inside a transaction. Each one first takes a
 * row lock on the parent expense (`SELECT ... FOR UPDATE`), which serializes
 * concurrent refund writes against the same expense. Without the lock, two
 * requests under Postgres' default READ COMMITTED isolation could both observe
 * the same remaining headroom and both commit.
 */

export class OverRefundError extends Error {
  constructor(
    readonly refundableRemaining: number,
    readonly grossAmount: number
  ) {
    super("Refunds would exceed the expense amount");
    this.name = "OverRefundError";
  }
}

export class ExpenseAmountBelowRefundsError extends Error {
  constructor(readonly refundedTotal: number) {
    super("Expense amount is below its refunded total");
    this.name = "ExpenseAmountBelowRefundsError";
  }
}

export class RecurringExpenseRefundError extends Error {
  constructor() {
    super("Refunds are not supported on recurring expenses");
    this.name = "RecurringExpenseRefundError";
  }
}

export class ExpenseVanishedError extends Error {
  constructor() {
    super("Expense no longer exists");
    this.name = "ExpenseVanishedError";
  }
}

type LockedExpense = {
  id: string;
  amount: Prisma.Decimal;
  date: Date;
  isRecurring: boolean;
  recurrence: string | null;
};

async function lockExpense(
  tx: Prisma.TransactionClient,
  expenseId: string
): Promise<LockedExpense> {
  const rows = await tx.$queryRaw<LockedExpense[]>`
    SELECT "id", "amount", "date", "isRecurring", "recurrence"
    FROM "Expense"
    WHERE "id" = ${expenseId}
    FOR UPDATE
  `;

  const expense = rows[0];
  if (!expense) throw new ExpenseVanishedError();

  return expense;
}

async function sumRefundCents(
  tx: Prisma.TransactionClient,
  expenseId: string,
  excludeRefundId?: string
): Promise<number> {
  const refunds = await tx.refund.findMany({
    where: {
      expenseId,
      ...(excludeRefundId ? { id: { not: excludeRefundId } } : {}),
    },
    select: { amount: true },
  });

  return refunds.reduce((cents, r) => cents + toCents(r.amount), 0);
}

/**
 * Confirms a new or edited refund of `amount` fits within the expense.
 * Pass `excludeRefundId` when editing so the refund's own current amount does
 * not count against its replacement. Returns the locked expense, whose `date`
 * is the value a new refund must inherit.
 */
export async function assertRefundFitsExpense(
  tx: Prisma.TransactionClient,
  {
    expenseId,
    amount,
    excludeRefundId,
  }: { expenseId: string; amount: number; excludeRefundId?: string }
): Promise<LockedExpense> {
  const expense = await lockExpense(tx, expenseId);

  if (expense.isRecurring || expense.recurrence) {
    throw new RecurringExpenseRefundError();
  }

  const grossCents = toCents(expense.amount);
  const otherRefundCents = await sumRefundCents(tx, expenseId, excludeRefundId);
  const headroomCents = grossCents - otherRefundCents;

  if (toCents(amount) > headroomCents) {
    throw new OverRefundError(fromCents(Math.max(0, headroomCents)), fromCents(grossCents));
  }

  return expense;
}

/**
 * Confirms an expense's new amount still covers everything already refunded.
 * Without this, refunding $40 of a $50 expense and then editing the expense
 * down to $20 would leave a negative net amount.
 */
export async function assertExpenseAmountCoversRefunds(
  tx: Prisma.TransactionClient,
  { expenseId, newAmount }: { expenseId: string; newAmount: number }
): Promise<void> {
  await lockExpense(tx, expenseId);

  const refundedCents = await sumRefundCents(tx, expenseId);

  if (toCents(newAmount) < refundedCents) {
    throw new ExpenseAmountBelowRefundsError(fromCents(refundedCents));
  }
}

/**
 * Translates a guard failure into a response. Returns null for anything else so
 * callers fall through to their generic 500 handling.
 */
export function mapRefundGuardError(
  error: unknown,
  currency = "USD"
): { message: string; status: number } | null {
  if (error instanceof OverRefundError) {
    return {
      message:
        error.refundableRemaining > 0
          ? `Refund exceeds this expense. At most ${formatCurrency(
              error.refundableRemaining,
              currency
            )} can still be refunded.`
          : "This expense is already fully refunded.",
      status: 400,
    };
  }

  if (error instanceof ExpenseAmountBelowRefundsError) {
    return {
      message: `Expense amount cannot be less than the ${formatCurrency(
        error.refundedTotal,
        currency
      )} already refunded. Reduce or remove the refunds first.`,
      status: 400,
    };
  }

  if (error instanceof RecurringExpenseRefundError) {
    return {
      message:
        "Refunds are not supported on recurring expenses. Remove recurrence or create a one-time expense instead.",
      status: 400,
    };
  }

  if (error instanceof ExpenseVanishedError) {
    return { message: "Expense not found", status: 404 };
  }

  return null;
}
