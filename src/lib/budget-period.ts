import type { PeriodType } from "@prisma/client";

/**
 * Period boundaries use the JavaScript local timezone (same as DatePicker / browser),
 * matching the existing calculatePeriodDates helper in client-utils.
 */
export type PeriodBounds = { start: Date; end: Date };

/** Minimal budget fields for period + carry math (API or Prisma model). */
export type BudgetPeriodInput = {
  periodType: PeriodType;
  periodDay: number | null;
  customDays: number | null;
  startDate: Date | null;
  createdAt: Date;
  carryOverRemainder: boolean;
};

export type EnvelopeCarryInput = {
  id: string;
  allocation: number;
  carryOverRemainder: boolean | null;
};

export type ExpenseInPeriodInput = {
  envelopeId: string;
  date: Date;
  amount: number;
};

export type EnvelopePeriodTotals = {
  envelopeId: string;
  baseAllocation: number;
  carriedFromPrior: number;
  availableThisPeriod: number;
  spentThisPeriod: number;
  remainingThisPeriod: number;
  effectiveCarryEnabled: boolean;
};

export type BudgetPeriodTotals = {
  currentPeriod: PeriodBounds;
  previousPeriod: PeriodBounds | null;
  envelopeTotals: EnvelopePeriodTotals[];
  totalBaseAllocation: number;
  totalCarriedFromPrior: number;
  totalAvailableThisPeriod: number;
  totalSpentThisPeriod: number;
  totalRemainingThisPeriod: number;
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return x;
}

/** Last valid day-of-month for (year, monthIndex 0–11), clamping values like 31 in February. */
export function clampDayOfMonth(year: number, monthIndex: number, desiredDay: number): number {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(desiredDay, last);
}

function budgetAnchor(budget: BudgetPeriodInput): Date {
  return startOfLocalDay(budget.startDate ?? budget.createdAt);
}

/**
 * Period containing `referenceDate` for MONTHLY with period start on `periodDay` (1–31, clamped per month).
 */
function getMonthlyPeriodContaining(referenceDate: Date, periodDay: number): PeriodBounds {
  const ref = referenceDate;
  const day = clampDayOfMonth(ref.getFullYear(), ref.getMonth(), periodDay);
  let start = new Date(ref.getFullYear(), ref.getMonth(), day, 0, 0, 0, 0);
  if (ref < start) {
    const py = ref.getFullYear();
    const pm = ref.getMonth() - 1;
    const prevMonth = pm < 0 ? 11 : pm;
    const prevYear = pm < 0 ? py - 1 : py;
    const dPrev = clampDayOfMonth(prevYear, prevMonth, periodDay);
    start = new Date(prevYear, prevMonth, dPrev, 0, 0, 0, 0);
  }
  const nextMonthStart = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const dNext = clampDayOfMonth(nextMonthStart.getFullYear(), nextMonthStart.getMonth(), periodDay);
  const nextStart = new Date(
    nextMonthStart.getFullYear(),
    nextMonthStart.getMonth(),
    dNext,
    0,
    0,
    0,
    0
  );
  const end = new Date(nextStart.getTime() - 1);
  return { start, end };
}

/** Sliding week from weekday when no startDate (periodDay = 0 Sunday .. 6 Saturday). */
function getWeeklySlidingPeriodContaining(referenceDate: Date, dayOfWeek: number, lengthDays: number): PeriodBounds {
  const now = referenceDate;
  const currentDay = now.getDay();
  const diff =
    currentDay >= dayOfWeek ? currentDay - dayOfWeek : 7 - (dayOfWeek - currentDay);
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + lengthDays - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function addLocalDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Fixed-length periods from an anchor (weekly / biweekly / custom). */
function getAnchoredPeriodContaining(
  referenceDate: Date,
  anchor: Date,
  periodLengthDays: number
): PeriodBounds {
  const ref0 = startOfLocalDay(referenceDate);
  const a0 = startOfLocalDay(anchor);
  const msPerDay = 86_400_000;

  if (ref0.getTime() >= a0.getTime()) {
    const dayDiff = Math.floor((ref0.getTime() - a0.getTime()) / msPerDay);
    const idx = Math.floor(dayDiff / periodLengthDays);
    const start = addLocalDays(a0, idx * periodLengthDays);
    start.setHours(0, 0, 0, 0);
    const end = addLocalDays(start, periodLengthDays - 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const dayDiff = Math.floor((a0.getTime() - ref0.getTime()) / msPerDay);
  const idx = Math.ceil(dayDiff / periodLengthDays);
  const start = addLocalDays(a0, -idx * periodLengthDays);
  start.setHours(0, 0, 0, 0);
  const end = addLocalDays(start, periodLengthDays - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getPeriodContaining(referenceDate: Date, budget: BudgetPeriodInput): PeriodBounds {
  switch (budget.periodType) {
    case "MONTHLY": {
      const periodDay = budget.periodDay ?? 1;
      return getMonthlyPeriodContaining(referenceDate, periodDay);
    }
    case "WEEKLY": {
      if (budget.startDate) {
        return getAnchoredPeriodContaining(referenceDate, budgetAnchor(budget), 7);
      }
      return getWeeklySlidingPeriodContaining(referenceDate, budget.periodDay ?? 0, 7);
    }
    case "BIWEEKLY": {
      if (budget.startDate) {
        return getAnchoredPeriodContaining(referenceDate, budgetAnchor(budget), 14);
      }
      return getWeeklySlidingPeriodContaining(referenceDate, budget.periodDay ?? 0, 14);
    }
    case "CUSTOM": {
      const days = budget.customDays ?? 30;
      return getAnchoredPeriodContaining(referenceDate, budgetAnchor(budget), days);
    }
    default: {
      const _exhaustive: never = budget.periodType;
      throw new Error(`Unknown period type: ${_exhaustive}`);
    }
  }
}

export function getPreviousPeriod(
  current: PeriodBounds,
  budget: BudgetPeriodInput
): PeriodBounds | null {
  const probe = new Date(current.start.getTime() - 1);
  const prev = getPeriodContaining(probe, budget);
  if (prev.start.getTime() >= current.start.getTime()) {
    return null;
  }
  return prev;
}

export function getNextPeriod(
  current: PeriodBounds,
  budget: BudgetPeriodInput
): PeriodBounds | null {
  const probe = new Date(current.end.getTime() + 1);
  const next = getPeriodContaining(probe, budget);
  if (next.start.getTime() <= current.start.getTime()) {
    return null;
  }
  return next;
}

export type BuildBudgetPeriodWindowOptions = {
  maxFuturePeriods?: number;
  now?: Date;
};

/**
 * Chronological list of periods from the first that overlaps the budget anchor
 * through calendar current, plus up to `maxFuturePeriods` future periods (default 12).
 */
/**
 * Maps store state to the active period bounds. `null` means calendar current as of `now`.
 */
export function resolveViewingPeriodForBudget(
  budget: BudgetPeriodInput,
  viewingPeriodStartMs: number | null,
  now: Date = new Date()
): PeriodBounds {
  if (viewingPeriodStartMs === null) {
    return getPeriodContaining(now, budget);
  }
  return getPeriodContaining(new Date(viewingPeriodStartMs), budget);
}

export function buildBudgetPeriodWindow(
  budget: BudgetPeriodInput,
  options?: BuildBudgetPeriodWindowOptions
): PeriodBounds[] {
  const maxFuture = options?.maxFuturePeriods ?? 12;
  const now = options?.now ?? new Date();
  const anchor = budgetAnchor(budget);
  const calendarCurrent = getPeriodContaining(now, budget);

  const periods: PeriodBounds[] = [];
  let cur = calendarCurrent;
  while (true) {
    periods.unshift(cur);
    const prev = getPreviousPeriod(cur, budget);
    if (!prev || prev.end.getTime() < anchor.getTime()) {
      break;
    }
    cur = prev;
  }

  let tail = calendarCurrent;
  for (let i = 0; i < maxFuture; i++) {
    const next = getNextPeriod(tail, budget);
    if (!next) {
      break;
    }
    periods.push(next);
    tail = next;
  }

  return periods;
}

export function sumExpensesInRange(
  expenses: ExpenseInPeriodInput[],
  range: PeriodBounds,
  envelopeId?: string
): number {
  return expenses.reduce((sum, e) => {
    if (envelopeId !== undefined && e.envelopeId !== envelopeId) return sum;
    const t = e.date.getTime();
    if (t >= range.start.getTime() && t <= range.end.getTime()) {
      return sum + e.amount;
    }
    return sum;
  }, 0);
}

function effectiveCarryForEnvelope(
  budget: BudgetPeriodInput,
  envelope: EnvelopeCarryInput
): boolean {
  return envelope.carryOverRemainder ?? budget.carryOverRemainder;
}

/**
 * No carry from time before the budget existed (anchor = startDate ?? createdAt start of local day).
 */
function shouldApplyCarryFromPrevious(
  budget: BudgetPeriodInput,
  previousPeriod: PeriodBounds | null
): boolean {
  if (!previousPeriod) return false;
  const budgetStart = budgetAnchor(budget);
  return previousPeriod.end.getTime() >= budgetStart.getTime();
}

export function computeCarryAndPeriodTotalsForViewingPeriod(
  budget: BudgetPeriodInput,
  envelopes: EnvelopeCarryInput[],
  expenses: ExpenseInPeriodInput[],
  viewingPeriod: PeriodBounds
): BudgetPeriodTotals {
  const previousPeriod = getPreviousPeriod(viewingPeriod, budget);
  const applyCarry = shouldApplyCarryFromPrevious(budget, previousPeriod);

  const envelopeTotals: EnvelopePeriodTotals[] = envelopes.map((env) => {
    const baseAllocation = env.allocation;
    const carryEnabled = effectiveCarryForEnvelope(budget, env);
    let carriedFromPrior = 0;
    if (applyCarry && carryEnabled && previousPeriod) {
      const spentPrior = sumExpensesInRange(expenses, previousPeriod, env.id);
      carriedFromPrior = Math.max(0, baseAllocation - spentPrior);
    }
    const availableThisPeriod = baseAllocation + carriedFromPrior;
    const spentThisPeriod = sumExpensesInRange(expenses, viewingPeriod, env.id);
    const remainingThisPeriod = availableThisPeriod - spentThisPeriod;

    return {
      envelopeId: env.id,
      baseAllocation,
      carriedFromPrior,
      availableThisPeriod,
      spentThisPeriod,
      remainingThisPeriod,
      effectiveCarryEnabled: carryEnabled,
    };
  });

  const totalBaseAllocation = envelopeTotals.reduce((s, e) => s + e.baseAllocation, 0);
  const totalCarriedFromPrior = envelopeTotals.reduce((s, e) => s + e.carriedFromPrior, 0);
  const totalAvailableThisPeriod = envelopeTotals.reduce((s, e) => s + e.availableThisPeriod, 0);
  const totalSpentThisPeriod = envelopeTotals.reduce((s, e) => s + e.spentThisPeriod, 0);
  const totalRemainingThisPeriod = envelopeTotals.reduce((s, e) => s + e.remainingThisPeriod, 0);

  return {
    currentPeriod: viewingPeriod,
    previousPeriod,
    envelopeTotals,
    totalBaseAllocation,
    totalCarriedFromPrior,
    totalAvailableThisPeriod,
    totalSpentThisPeriod,
    totalRemainingThisPeriod,
  };
}

export function computeCarryAndPeriodTotals(
  budget: BudgetPeriodInput,
  envelopes: EnvelopeCarryInput[],
  expenses: ExpenseInPeriodInput[],
  referenceDate: Date = new Date()
): BudgetPeriodTotals {
  return computeCarryAndPeriodTotalsForViewingPeriod(
    budget,
    envelopes,
    expenses,
    getPeriodContaining(referenceDate, budget)
  );
}
