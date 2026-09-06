/**
 * Refund math shared by the API routes and the client.
 *
 * Money arrives here in three shapes: a Prisma `Decimal` on the server, the
 * string that `Decimal` serializes to over JSON, and a plain `number` from
 * form state. `Number()` handles all three, which also keeps this module free
 * of Prisma runtime imports so client components can use it.
 */

export type AmountLike = number | string | { toString(): string };

export type RefundStatus = "NONE" | "PARTIAL" | "FULL";

export type RefundAmountLike = { amount: AmountLike };

export type ExpenseRefundSummary = {
  /** The expense amount before any refunds. */
  grossAmount: number;
  /** Combined amount of every refund on the expense. */
  refundedTotal: number;
  /** What the expense actually cost: gross minus refunds. */
  netAmount: number;
  /** How much may still be refunded before exceeding the expense. */
  refundableRemaining: number;
  status: RefundStatus;
  refundCount: number;
};

/**
 * Money is stored as DECIMAL(12,2), so intermediate sums are rounded to cents
 * to keep float drift from making a legitimate full refund look like a $0.001
 * overage.
 */
export function toCents(amount: AmountLike): number {
  return Math.round(Number(amount) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function roundMoney(amount: number): number {
  return fromCents(Math.round(amount * 100));
}

export function sumRefundAmounts(refunds: RefundAmountLike[] | undefined): number {
  if (!refunds?.length) return 0;
  return fromCents(refunds.reduce((cents, r) => cents + toCents(r.amount), 0));
}

export function getRefundStatus(grossAmount: number, refundedTotal: number): RefundStatus {
  const refundedCents = toCents(refundedTotal);
  if (refundedCents <= 0) return "NONE";
  return refundedCents >= toCents(grossAmount) ? "FULL" : "PARTIAL";
}

export function getRefundSummary(expense: {
  amount: AmountLike;
  refunds?: RefundAmountLike[];
}): ExpenseRefundSummary {
  const grossAmount = roundMoney(Number(expense.amount));
  const refundedTotal = sumRefundAmounts(expense.refunds);
  const netAmount = roundMoney(grossAmount - refundedTotal);

  return {
    grossAmount,
    refundedTotal,
    netAmount,
    refundableRemaining: Math.max(0, netAmount),
    status: getRefundStatus(grossAmount, refundedTotal),
    refundCount: expense.refunds?.length ?? 0,
  };
}

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  NONE: "Not refunded",
  PARTIAL: "Partially refunded",
  FULL: "Refunded",
};
