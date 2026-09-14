import type { ExpenseInPeriodInput } from "@/lib/budget-period";
import { sumRefundAmounts } from "@/lib/refunds";

type ExpenseRow = {
  envelopeId: string;
  date: Date;
  amount: unknown;
  recurrence?: string | null;
  recurrenceEndDate?: Date | null;
  refunds?: { amount: unknown }[];
};

export function expensesToPeriodInputs(expenses: ExpenseRow[]): ExpenseInPeriodInput[] {
  return expenses.map((e) => ({
    envelopeId: e.envelopeId,
    date: new Date(e.date),
    amount: Number(e.amount),
    recurrence: e.recurrence as ExpenseInPeriodInput["recurrence"],
    recurrenceEndDate: e.recurrenceEndDate ? new Date(e.recurrenceEndDate) : null,
    refundedAmount: sumRefundAmounts(
      (e.refunds ?? []) as { amount: number | string }[]
    ),
  }));
}
