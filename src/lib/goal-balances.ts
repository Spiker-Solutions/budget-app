import type { GoalType } from "@prisma/client";
import { roundMoney } from "@/lib/refunds";

export type GoalContributionInput = {
  amount: number;
  date: Date;
  recurrence?: string | null;
  recurrenceEndDate?: Date | null;
  refundedAmount?: number;
};

export type GoalChargeInput = {
  amount: number;
};

export type GoalBalanceInput = {
  type: GoalType;
  startingAmount: number;
  targetAmount: number;
  contributions: GoalContributionInput[];
  charges: GoalChargeInput[];
};

/** Net contribution amount for one expense row (no refunds on goal-linked expenses). */
export function netContributionAmount(c: GoalContributionInput): number {
  const base = c.amount - (c.refundedAmount ?? 0);
  return roundMoney(Math.max(0, base));
}

export function sumContributions(contributions: GoalContributionInput[]): number {
  return roundMoney(
    contributions.reduce((sum, c) => sum + netContributionAmount(c), 0)
  );
}

export function sumCharges(charges: GoalChargeInput[]): number {
  return roundMoney(charges.reduce((sum, c) => sum + c.amount, 0));
}

/** Save: saved balance. Debt: amount still owed. */
export function computeGoalCurrentAmount(input: GoalBalanceInput): number {
  const contributed = sumContributions(input.contributions);
  const charged = sumCharges(input.charges);
  const start = input.startingAmount;

  if (input.type === "SAVE") {
    return roundMoney(start + contributed);
  }
  return roundMoney(start - contributed + charged);
}

export function computeSaveProgress(currentSaved: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0;
  return Math.min(100, (currentSaved / targetAmount) * 100);
}

export function computeDebtAmountPaid(startingOwed: number, currentOwed: number): number {
  return roundMoney(Math.max(0, startingOwed - currentOwed));
}

export function computeDebtProgress(
  startingOwed: number,
  currentOwed: number,
  payoffTarget: number
): number {
  const totalToPay = startingOwed - payoffTarget;
  if (totalToPay <= 0) return currentOwed <= payoffTarget ? 100 : 0;
  const paidDown = computeDebtAmountPaid(startingOwed, currentOwed);
  return Math.min(100, Math.max(0, (paidDown / totalToPay) * 100));
}
