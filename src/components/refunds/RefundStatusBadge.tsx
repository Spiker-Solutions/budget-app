import { Badge, Box, type BadgeProps } from "@mantine/core";
import { REFUND_STATUS_LABELS, type RefundStatus } from "@/lib/refunds";

interface RefundStatusBadgeProps {
  status: RefundStatus;
  size?: BadgeProps["size"];
  /** On small screens, show a colored dot instead of the full badge label. */
  compact?: boolean;
}

const STATUS_COLORS: Record<Exclude<RefundStatus, "NONE">, string> = {
  FULL: "teal",
  PARTIAL: "yellow",
};

export function RefundStatusBadge({
  status,
  size = "sm",
  compact = false,
}: RefundStatusBadgeProps) {
  if (status === "NONE") return null;

  const color = STATUS_COLORS[status];
  const label = REFUND_STATUS_LABELS[status];

  if (compact) {
    return (
      <>
        <Badge size={size} variant="light" color={color} visibleFrom="sm">
          {label}
        </Badge>
        <Box
          hiddenFrom="sm"
          w={8}
          h={8}
          style={{ borderRadius: "50%", flexShrink: 0 }}
          bg={`var(--mantine-color-${color}-filled)`}
          aria-label={label}
          title={label}
        />
      </>
    );
  }

  return (
    <Badge size={size} variant="light" color={color}>
      {label}
    </Badge>
  );
}
