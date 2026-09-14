import { useMemo } from "react";
import type { Goal, GoalCharge } from "@prisma/client";
import type { ExpenseWithRelations } from "@/types";
import {
  computeDebtProgress,
  computeGoalCurrentAmount,
  computeSaveProgress,
} from "@/lib/goal-balances";

export function useGoalProgress(
  goal: Pick<Goal, "type" | "startingAmount" | "targetAmount"> | null,
  expenses: Pick<ExpenseWithRelations, "amount" | "date" | "recurrence" | "recurrenceEndDate" | "refunds">[],
  charges: Pick<GoalCharge, "amount">[]
) {
  return useMemo(() => {
    if (!goal) {
      return {
        currentAmount: 0,
        progressPercent: 0,
        label: "",
      };
    }

    const starting = Number(goal.startingAmount);
    const target = Number(goal.targetAmount);

    const contributions = expenses.map((e) => ({
      amount: Number(e.amount),
      date: new Date(e.date),
      recurrence: e.recurrence,
      recurrenceEndDate: e.recurrenceEndDate ? new Date(e.recurrenceEndDate) : null,
      refundedAmount: 0,
    }));

    const currentAmount = computeGoalCurrentAmount({
      type: goal.type,
      startingAmount: starting,
      targetAmount: target,
      contributions,
      charges: charges.map((c) => ({ amount: Number(c.amount) })),
    });

    if (goal.type === "SAVE") {
      return {
        currentAmount,
        progressPercent: computeSaveProgress(currentAmount, target),
        label: "saved",
      };
    }

    return {
      currentAmount,
      progressPercent: computeDebtProgress(starting, currentAmount, target),
      label: "owed",
    };
  }, [goal, expenses, charges]);
}
