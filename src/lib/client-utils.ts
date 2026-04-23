import { getPeriodContaining } from "@/lib/budget-period";

export function formatCurrency(
  amount: number | string,
  currency = "USD"
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount);
}

export function normalizePayeeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * @deprecated Prefer getPeriodContaining from @/lib/budget-period with full Budget fields.
 * Legacy helper: CUSTOM periods without startDate align to the calendar day of referenceDate (same as before).
 */
export function calculatePeriodDates(
  periodType: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM",
  periodDay: number | null,
  customDays: number | null,
  referenceDate: Date = new Date(),
  options?: { startDate?: Date | null; budgetCreatedAt?: Date }
): { start: Date; end: Date } {
  const legacyAnchor = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0
  );
  return getPeriodContaining(referenceDate, {
    periodType,
    periodDay,
    customDays,
    startDate: options?.startDate ?? null,
    createdAt: options?.budgetCreatedAt ?? legacyAnchor,
    carryOverRemainder: false,
  });
}
