import { Badge, Box, type BadgeProps } from "@mantine/core";
import type { RecurrenceType } from "@prisma/client";
import { RECURRENCE_LABELS } from "@/lib/recurrence";

interface RecurringBadgeProps {
  recurrence: RecurrenceType;
  size?: BadgeProps["size"];
  /** On small screens, show a colored dot instead of the full badge label. */
  compact?: boolean;
}

export function RecurringBadge({
  recurrence,
  size = "sm",
  compact = false,
}: RecurringBadgeProps) {
  const label = RECURRENCE_LABELS[recurrence];

  if (compact) {
    return (
      <>
        <Badge size={size} variant="light" color="violet" visibleFrom="sm">
          {label}
        </Badge>
        <Box
          hiddenFrom="sm"
          w={8}
          h={8}
          style={{ borderRadius: "50%", flexShrink: 0 }}
          bg="var(--mantine-color-violet-filled)"
          aria-label={`Recurring: ${label}`}
          title={`Recurring: ${label}`}
        />
      </>
    );
  }

  return (
    <Badge size={size} variant="light" color="violet">
      {label}
    </Badge>
  );
}
