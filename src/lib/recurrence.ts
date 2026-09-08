import type { RecurrenceType } from "@prisma/client";
import { clampDayOfMonth, type PeriodBounds } from "@/lib/budget-period";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addLocalDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return startOfLocalDay(x);
}

export function isRecurringExpense(
  recurrence: RecurrenceType | null | undefined
): recurrence is RecurrenceType {
  return recurrence != null;
}

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

/**
 * All occurrence dates for a recurring expense that fall within `range`, using
 * `anchor` as the first occurrence and optionally stopping after
 * `recurrenceEndDate` (inclusive).
 */
export function getOccurrenceDatesInRange(
  anchor: Date,
  recurrence: RecurrenceType,
  recurrenceEndDate: Date | null | undefined,
  range: PeriodBounds
): Date[] {
  const anchorDay = startOfLocalDay(anchor);
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();

  let effectiveEnd = rangeEnd;
  if (recurrenceEndDate) {
    effectiveEnd = Math.min(endOfLocalDay(recurrenceEndDate).getTime(), rangeEnd);
  }

  if (anchorDay.getTime() > effectiveEnd) {
    return [];
  }

  const searchStart = Math.max(rangeStart, anchorDay.getTime());
  const occurrences: Date[] = [];

  switch (recurrence) {
    case "DAILY": {
      let current = startOfLocalDay(new Date(searchStart));
      while (current.getTime() <= effectiveEnd) {
        occurrences.push(new Date(current));
        current = addLocalDays(current, 1);
      }
      break;
    }
    case "WEEKLY":
    case "BIWEEKLY": {
      const step = recurrence === "WEEKLY" ? 7 : 14;
      let current = anchorDay;
      if (current.getTime() < searchStart) {
        const msPerDay = 86_400_000;
        const daysDiff = Math.floor((searchStart - anchorDay.getTime()) / msPerDay);
        const periodsElapsed = Math.floor(daysDiff / step);
        current = addLocalDays(anchorDay, periodsElapsed * step);
        if (current.getTime() < searchStart) {
          current = addLocalDays(current, step);
        }
      }
      while (current.getTime() <= effectiveEnd) {
        occurrences.push(new Date(current));
        current = addLocalDays(current, step);
      }
      break;
    }
    case "MONTHLY": {
      const anchorDayOfMonth = anchorDay.getDate();
      let year = new Date(searchStart).getFullYear();
      let month = new Date(searchStart).getMonth();

      let day = clampDayOfMonth(year, month, anchorDayOfMonth);
      let current = startOfLocalDay(new Date(year, month, day));
      if (current.getTime() > searchStart) {
        month -= 1;
        if (month < 0) {
          month = 11;
          year -= 1;
        }
        day = clampDayOfMonth(year, month, anchorDayOfMonth);
        current = startOfLocalDay(new Date(year, month, day));
      }

      while (current.getTime() <= effectiveEnd) {
        if (current.getTime() >= searchStart) {
          occurrences.push(new Date(current));
        }
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
        day = clampDayOfMonth(year, month, anchorDayOfMonth);
        current = startOfLocalDay(new Date(year, month, day));
      }
      break;
    }
    case "YEARLY": {
      const anchorMonth = anchorDay.getMonth();
      const anchorDayNum = anchorDay.getDate();
      let year = new Date(searchStart).getFullYear();

      let day = clampDayOfMonth(year, anchorMonth, anchorDayNum);
      let current = startOfLocalDay(new Date(year, anchorMonth, day));
      if (current.getTime() > searchStart) {
        year -= 1;
        day = clampDayOfMonth(year, anchorMonth, anchorDayNum);
        current = startOfLocalDay(new Date(year, anchorMonth, day));
      }

      while (current.getTime() <= effectiveEnd) {
        if (current.getTime() >= searchStart) {
          occurrences.push(new Date(current));
        }
        year += 1;
        day = clampDayOfMonth(year, anchorMonth, anchorDayNum);
        current = startOfLocalDay(new Date(year, anchorMonth, day));
      }
      break;
    }
    default: {
      const _exhaustive: never = recurrence;
      throw new Error(`Unknown recurrence type: ${_exhaustive}`);
    }
  }

  return occurrences;
}

export function countOccurrencesInRange(
  anchor: Date,
  recurrence: RecurrenceType,
  recurrenceEndDate: Date | null | undefined,
  range: PeriodBounds
): number {
  return getOccurrenceDatesInRange(anchor, recurrence, recurrenceEndDate, range).length;
}

export function occursInRange(
  anchor: Date,
  recurrence: RecurrenceType,
  recurrenceEndDate: Date | null | undefined,
  range: PeriodBounds
): boolean {
  return countOccurrencesInRange(anchor, recurrence, recurrenceEndDate, range) > 0;
}
