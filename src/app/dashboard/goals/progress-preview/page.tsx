"use client";

import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { GoalType } from "@prisma/client";
import { GOAL_PROGRESS_COLOR_STEP_PERCENT } from "@/lib/goal-progress-color";
import { GoalProgressBar } from "@/components/goals/GoalProgressBar";
import { GoalProgressPercentBadge } from "@/components/goals/GoalProgressPercentBadge";
import { formatCurrency } from "@/lib/client-utils";

const PERCENTS = [0, 25, 50, 75, 100] as const;

function MockGoalCard({
  type,
  progressPercent,
}: {
  type: GoalType;
  progressPercent: number;
}) {
  const isSave = type === "SAVE";
  const target = isSave ? 5000 : 0;
  const startingOwed = isSave ? 0 : 2500;
  const totalToPay = startingOwed - target;

  let primaryAmount: number;
  let secondaryAmount: number;
  if (isSave) {
    primaryAmount = (progressPercent / 100) * 5000;
    secondaryAmount = 5000;
  } else {
    primaryAmount = (progressPercent / 100) * totalToPay;
    secondaryAmount = startingOwed - primaryAmount;
  }

  return (
    <Card withBorder miw={280}>
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{isSave ? "Vacation Fund" : "Credit Card"}</Text>
        <Group gap={4}>
          <Badge variant="light" color="gray">
            {isSave ? "Save" : "Debt"}
          </Badge>
          <GoalProgressPercentBadge type={type} percent={progressPercent} />
        </Group>
      </Group>
      <GoalProgressBar type={type} value={progressPercent} mb="sm" />
      <Text size="sm">
        {formatCurrency(primaryAmount, "USD")}{" "}
        {isSave ? "saved" : "paid"} / {formatCurrency(secondaryAmount, "USD")}{" "}
        {isSave ? "target" : "owed"}
      </Text>
    </Card>
  );
}

export default function GoalProgressPreviewPage() {
  return (
    <Stack gap="xl" p="md" maw={900} data-testid="goal-progress-preview">
      <Title order={2}>Goal progress colors (preview)</Title>
      <Text c="dimmed" size="sm">
        Save: light fill deepening toward green at 100%. Debt: red → yellow at 50% → green at
        100%. Fill and badge colors update every {GOAL_PROGRESS_COLOR_STEP_PERCENT}% (change{" "}
        <Text span ff="monospace" size="sm">
          GOAL_PROGRESS_COLOR_STEP_PERCENT
        </Text>{" "}
        in goal-progress-color.ts to 5 for finer steps).
      </Text>
      {PERCENTS.map((percent) => (
        <Stack key={percent} gap="sm" data-percent={percent}>
          <Title order={4}>{percent}% progress</Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <MockGoalCard type="SAVE" progressPercent={percent} />
            <MockGoalCard type="DEBT" progressPercent={percent} />
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  );
}
