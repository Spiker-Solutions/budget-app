"use client";

import { Badge, Card, Group, Progress, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { GoalType } from "@prisma/client";
import {
  goalProgressBadgeColor,
  goalProgressBarColor,
} from "@/lib/goal-progress-color";
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

  const badgeColor = goalProgressBadgeColor(type, progressPercent);

  return (
    <Card withBorder miw={280}>
      <Group justify="space-between" mb="xs">
        <Text fw={600}>{isSave ? "Vacation Fund" : "Credit Card"}</Text>
        <Group gap={4}>
          <Badge variant="light" color="gray">
            {isSave ? "Save" : "Debt"}
          </Badge>
          <Badge variant="light" color={badgeColor}>
            {progressPercent}%
          </Badge>
        </Group>
      </Group>
      <Progress
        value={progressPercent}
        size="lg"
        mb="sm"
        color={goalProgressBarColor(type, progressPercent)}
      />
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
        100%.
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
