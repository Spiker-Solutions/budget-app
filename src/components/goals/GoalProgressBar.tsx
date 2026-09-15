"use client";

import { Progress, type ProgressRootProps } from "@mantine/core";
import type { GoalType } from "@prisma/client";
import { goalProgressFillHex } from "@/lib/goal-progress-color";

type GoalProgressBarProps = {
  type: GoalType;
  /** Actual progress 0–100 (bar width); fill color uses stepped palette. */
  value: number;
  "aria-label"?: string;
} & Pick<ProgressRootProps, "size" | "mb" | "mt" | "m" | "w">;

/**
 * Goal progress fill bypasses Mantine theme `color` (which often stays primary/blue).
 * Section uses explicit backgroundColor from our gradient.
 */
export function GoalProgressBar({
  type,
  value,
  size = "lg",
  "aria-label": ariaLabel,
  ...rootProps
}: GoalProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const fill = goalProgressFillHex(type, clamped);

  return (
    <Progress.Root size={size} {...rootProps}>
      <Progress.Section
        value={clamped}
        aria-label={ariaLabel ?? `${Math.round(clamped)}% progress`}
        style={{ backgroundColor: fill }}
      />
    </Progress.Root>
  );
}
