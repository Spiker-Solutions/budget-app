import type { BudgetPeriodInput, EnvelopeCarryInput, ExpenseInPeriodInput } from "@/lib/budget-period";
import { computeCarryAndPeriodTotals } from "@/lib/budget-period";

export type EnvelopeRemainderRow = {
  envelopeId: string;
  envelopeName: string;
  remainingThisPeriod: number;
  availableThisPeriod: number;
  spentThisPeriod: number;
};

export function computeEnvelopeRemaindersForPeriod(
  budget: BudgetPeriodInput,
  envelopes: (EnvelopeCarryInput & { name: string })[],
  expenses: ExpenseInPeriodInput[],
  referenceDate: Date,
  budgetAmount: number
): EnvelopeRemainderRow[] {
  const totals = computeCarryAndPeriodTotals(
    budget,
    envelopes,
    expenses,
    referenceDate,
    budgetAmount
  );

  return totals.envelopeTotals
    .map((t) => {
      const env = envelopes.find((e) => e.id === t.envelopeId);
      return {
        envelopeId: t.envelopeId,
        envelopeName: env?.name ?? "Envelope",
        remainingThisPeriod: t.remainingThisPeriod,
        availableThisPeriod: t.availableThisPeriod,
        spentThisPeriod: t.spentThisPeriod,
      };
    })
    .filter((row) => row.remainingThisPeriod > 0);
}
