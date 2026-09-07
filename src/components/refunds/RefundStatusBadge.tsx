import { Badge, type BadgeProps } from "@mantine/core";
import { REFUND_STATUS_LABELS, type RefundStatus } from "@/lib/refunds";

interface RefundStatusBadgeProps {
  status: RefundStatus;
  size?: BadgeProps["size"];
}

export function RefundStatusBadge({ status, size = "sm" }: RefundStatusBadgeProps) {
  if (status === "NONE") return null;

  return (
    <Badge size={size} variant="light" color={status === "FULL" ? "teal" : "yellow"}>
      {REFUND_STATUS_LABELS[status]}
    </Badge>
  );
}
