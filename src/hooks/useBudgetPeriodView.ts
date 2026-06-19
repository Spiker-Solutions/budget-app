import { useMemo, useCallback } from "react";
import { useBudgetStore } from "@/stores/budgetStore";
import { useUiStore } from "@/stores/uiStore";
import {
  computeCarryAndPeriodTotals,
  getNextPeriodReferenceDate,
  getPreviousPeriodReferenceDate,
  canNavigateToNextPeriod,
  canNavigateToPreviousPeriod,
  isViewingCurrentPeriod,
  hasMultipleViewablePeriods,
  getViewableDateRange,
  type BudgetPeriodInput,
  type BudgetPeriodTotals,
} from "@/lib/budget-period";
import type { Budget, BudgetWithRelations } from "@/types";

export function toBudgetPeriodInput(budget: Budget): BudgetPeriodInput {
  return {
    periodType: budget.periodType,
    periodDay: budget.periodDay ?? null,
    customDays: budget.customDays ?? null,
    startDate: budget.startDate ? new Date(budget.startDate) : null,
    createdAt: new Date(budget.createdAt),
    carryOverRemainder: budget.carryOverRemainder,
  };
}

type EnvelopeLike = {
  id: string;
  allocation: unknown;
  allocationType?: "AMOUNT" | "PERCENTAGE";
  carryOverRemainder: boolean | null;
};

type ExpenseLike = {
  envelopeId: string;
  date: Date | string;
  amount: unknown;
};

export function useBudgetPeriodView(
  envelopes: EnvelopeLike[],
  expenses: ExpenseLike[]
): {
  currentBudget: BudgetWithRelations | undefined;
  referenceDate: Date;
  periodTotals: BudgetPeriodTotals | null;
  isCurrentPeriod: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  hasMultiplePeriods: boolean;
  viewableDateRange: { min: Date; max: Date } | null;
  goToPreviousPeriod: () => void;
  goToNextPeriod: () => void;
  goToCurrentPeriod: () => void;
  goToPeriodContainingDate: (date: Date) => void;
} {
  const { budgets } = useBudgetStore();
  const { currentBudgetId, periodReferenceIso, setPeriodReferenceIso } = useUiStore();

  const currentBudget = useMemo(
    () => budgets.find((b) => b.id === currentBudgetId),
    [budgets, currentBudgetId]
  );

  const referenceDate = useMemo(
    () => (periodReferenceIso ? new Date(periodReferenceIso) : new Date()),
    [periodReferenceIso]
  );

  const budgetInput = useMemo(
    () => (currentBudget ? toBudgetPeriodInput(currentBudget) : null),
    [currentBudget]
  );

  const periodTotals = useMemo(() => {
    if (!budgetInput) return null;
    const envelopeInputs = envelopes.map((e) => ({
      id: e.id,
      allocation: Number(e.allocation),
      allocationType: e.allocationType ?? "AMOUNT",
      carryOverRemainder: e.carryOverRemainder,
    }));
    const expenseInputs = expenses.map((e) => ({
      envelopeId: e.envelopeId,
      date: new Date(e.date),
      amount: Number(e.amount),
    }));
    return computeCarryAndPeriodTotals(
      budgetInput,
      envelopeInputs,
      expenseInputs,
      referenceDate,
      Number(currentBudget?.amount ?? 0)
    );
  }, [budgetInput, envelopes, expenses, referenceDate, currentBudget?.amount]);

  const isCurrentPeriod = useMemo(
    () => (budgetInput ? isViewingCurrentPeriod(referenceDate, budgetInput) : true),
    [budgetInput, referenceDate]
  );

  const canGoPrevious = useMemo(
    () => (budgetInput ? canNavigateToPreviousPeriod(referenceDate, budgetInput) : false),
    [budgetInput, referenceDate]
  );

  const canGoNext = useMemo(
    () => (budgetInput ? canNavigateToNextPeriod(referenceDate, budgetInput) : false),
    [budgetInput, referenceDate]
  );

  const hasMultiplePeriods = useMemo(
    () => (budgetInput ? hasMultipleViewablePeriods(budgetInput) : false),
    [budgetInput]
  );

  const viewableDateRange = useMemo(
    () => (budgetInput ? getViewableDateRange(budgetInput) : null),
    [budgetInput]
  );

  const goToPreviousPeriod = useCallback(() => {
    if (!budgetInput) return;
    const prev = getPreviousPeriodReferenceDate(referenceDate, budgetInput);
    if (prev) setPeriodReferenceIso(prev.toISOString());
  }, [budgetInput, referenceDate, setPeriodReferenceIso]);

  const goToNextPeriod = useCallback(() => {
    if (!budgetInput) return;
    const next = getNextPeriodReferenceDate(referenceDate, budgetInput);
    if (next) setPeriodReferenceIso(next.toISOString());
  }, [budgetInput, referenceDate, setPeriodReferenceIso]);

  const goToCurrentPeriod = useCallback(() => {
    setPeriodReferenceIso(null);
  }, [setPeriodReferenceIso]);

  const goToPeriodContainingDate = useCallback(
    (date: Date) => {
      if (!budgetInput) return;
      if (isViewingCurrentPeriod(date, budgetInput)) {
        setPeriodReferenceIso(null);
      } else {
        setPeriodReferenceIso(date.toISOString());
      }
    },
    [budgetInput, setPeriodReferenceIso]
  );

  return {
    currentBudget,
    referenceDate,
    periodTotals,
    isCurrentPeriod,
    canGoPrevious,
    canGoNext,
    hasMultiplePeriods,
    viewableDateRange,
    goToPreviousPeriod,
    goToNextPeriod,
    goToCurrentPeriod,
    goToPeriodContainingDate,
  };
}
