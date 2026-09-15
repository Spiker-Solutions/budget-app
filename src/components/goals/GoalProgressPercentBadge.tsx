"use client";

import { Badge, type BadgeProps } from "@mantine/core";
import type { GoalType } from "@prisma/client";
import { goalProgressBadgeStyles } from "@/lib/goal-progress-color";

type GoalProgressPercentBadgeProps = {
  type: GoalType;
  percent: number;
} & Omit<BadgeProps, "color" | "variant" | "children">;

/** Percent pill — same stepped hex as {@link GoalProgressBar}. */
export function GoalProgressPercentBadge({
  type,
  percent,
  ...badgeProps
}: GoalProgressPercentBadgeProps) {
  const display = Math.round(percent);
  return (
    <Badge variant="light" styles={goalProgressBadgeStyles(type, percent)} {...badgeProps}>
      {display}%
    </Badge>
  );
}
