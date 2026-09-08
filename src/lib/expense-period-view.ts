import {
  isExpenseInRange,
  type ExpenseInPeriodInput,
  type PeriodBounds,
} from "@/lib/budget-period";
import { getOccurrenceDatesInRange, isRecurringExpense } from "@/lib/recurrence";

export type ProjectedExpense<T> = T & {
  displayDate: Date;
  occurrenceKey: string;
};

/**
 * Expands recurring expenses into one row per occurrence in `range` so period
 * lists match the totals computed in budget-period.
 */
export function projectExpensesForPeriodView<
  T extends ExpenseInPeriodInput & { id: string },
>(expenses: T[], range: PeriodBounds, envelopeId?: string): ProjectedExpense<T>[] {
  const result: ProjectedExpense<T>[] = [];

  for (const expense of expenses) {
    if (envelopeId !== undefined && expense.envelopeId !== envelopeId) {
      continue;
    }

    if (!isRecurringExpense(expense.recurrence)) {
      if (isExpenseInRange(expense, range)) {
        result.push({
          ...expense,
          displayDate: expense.date,
          occurrenceKey: expense.id,
        });
      }
      continue;
    }

    const dates = getOccurrenceDatesInRange(
      expense.date,
      expense.recurrence,
      expense.recurrenceEndDate,
      range
    );

    for (const displayDate of dates) {
      result.push({
        ...expense,
        displayDate,
        occurrenceKey: `${expense.id}:${displayDate.toISOString()}`,
      });
    }
  }

  result.sort((a, b) => b.displayDate.getTime() - a.displayDate.getTime());
  return result;
}
