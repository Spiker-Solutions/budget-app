"use client";

import { DateInput, type DateInputProps } from "@mantine/dates";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export const DATE_DISPLAY_FORMAT = "MM/DD/YYYY";

function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = dayjs(trimmed, DATE_DISPLAY_FORMAT, true);
  if (!parsed.isValid()) {
    return null;
  }

  return parsed.toDate();
}

export type DateFieldProps = Omit<DateInputProps, "valueFormat" | "dateParser">;

export function DateField({ placeholder = DATE_DISPLAY_FORMAT, ...props }: DateFieldProps) {
  return (
    <DateInput
      valueFormat={DATE_DISPLAY_FORMAT}
      placeholder={placeholder}
      dateParser={parseDateInput}
      {...props}
    />
  );
}
