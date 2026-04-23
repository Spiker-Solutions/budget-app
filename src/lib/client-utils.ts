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

export function calculatePeriodDates(
  periodType: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM",
  periodDay: number | null,
  customDays: number | null,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const now = new Date(referenceDate);

  switch (periodType) {
    case "WEEKLY": {
      const dayOfWeek = periodDay ?? 0;
      const currentDay = now.getDay();
      const diff = currentDay >= dayOfWeek ? currentDay - dayOfWeek : 7 - (dayOfWeek - currentDay);
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "BIWEEKLY": {
      const dayOfWeek = periodDay ?? 0;
      const currentDay = now.getDay();
      const diff = currentDay >= dayOfWeek ? currentDay - dayOfWeek : 7 - (dayOfWeek - currentDay);
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 13);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "MONTHLY": {
      const dayOfMonth = periodDay ?? 1;
      const start = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 0, 0, 0, 0);
      if (start > now) {
        start.setMonth(start.getMonth() - 1);
      }
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "CUSTOM": {
      const days = customDays ?? 30;
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + days - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    default:
      throw new Error(`Unknown period type: ${periodType}`);
  }
}
