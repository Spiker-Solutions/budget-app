import type { RecurrenceType } from "@prisma/client";

export type RecurrenceFormValue =
  | "NONE"
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "YEARLY";

export function normalizeRecurrenceInput(
  recurrence: RecurrenceFormValue | undefined,
  recurrenceEndDate?: Date | string | null
): {
  isRecurring: boolean;
  recurrence: RecurrenceType | null;
  recurrenceEndDate: Date | null;
} {
  const isNone = !recurrence || recurrence === "NONE";

  return {
    isRecurring: !isNone,
    recurrence: isNone ? null : recurrence,
    recurrenceEndDate: isNone
      ? null
      : recurrenceEndDate
        ? new Date(recurrenceEndDate)
        : null,
  };
}

export function recurrenceToFormValue(
  recurrence: RecurrenceType | null | undefined
): RecurrenceFormValue {
  return recurrence ?? "NONE";
}
