import { Decimal } from "@prisma/client/runtime/library";

export function formatCurrency(
  amount: number | Decimal | string,
  currency = "USD"
): string {
  const numAmount =
    typeof amount === "string"
      ? parseFloat(amount)
      : amount instanceof Decimal
        ? amount.toNumber()
        : amount;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount);
}

export function normalizePayeeName(name: string): string {
  return name.trim().toLowerCase();
}

export type ApiResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function errorResponse(error: string): ApiResponse<never> {
  return { success: false, error };
}
