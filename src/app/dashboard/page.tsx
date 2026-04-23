"use client";

import { useEffect, useMemo } from "react";
import {
  Title,
  Text,
  Card,
  SimpleGrid,
  Stack,
  Group,
  Progress,
  Button,
  Skeleton,
  Badge,
  ThemeIcon,
} from "@mantine/core";
import { IconPlus, IconWallet, IconReceipt } from "@tabler/icons-react";
import Link from "next/link";
import { useBudgetStore } from "@/stores/budgetStore";
import { useEnvelopeStore } from "@/stores/envelopeStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { useUiStore } from "@/stores/uiStore";
import { formatCurrency } from "@/lib/client-utils";

export default function DashboardPage() {
  const { budgets, isLoading: budgetsLoading } = useBudgetStore();
  const { envelopes, fetchEnvelopes, isLoading: envelopesLoading } = useEnvelopeStore();
  const { expenses, fetchExpenses } = useExpenseStore();
  const { currentBudgetId } = useUiStore();

  const currentBudget = useMemo(
    () => budgets.find((b) => b.id === currentBudgetId),
    [budgets, currentBudgetId]
  );

  useEffect(() => {
    if (currentBudgetId) {
      fetchEnvelopes(currentBudgetId);
      fetchExpenses(undefined, currentBudgetId);
    }
  }, [currentBudgetId, fetchEnvelopes, fetchExpenses]);

  const totalAllocated = useMemo(
    () => envelopes.reduce((sum, e) => sum + Number(e.allocation), 0),
    [envelopes]
  );

  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const budgetAmount = currentBudget ? Number(currentBudget.amount) : 0;
  const remaining = budgetAmount - totalSpent;
  const spentPercentage = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

  if (budgetsLoading) {
    return (
      <Stack>
        <Skeleton height={40} width={300} />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </SimpleGrid>
        <Skeleton height={300} />
      </Stack>
    );
  }

  if (!currentBudget) {
    return (
      <Stack align="center" justify="center" h={400}>
        <ThemeIcon size={80} variant="light" radius="xl">
          <IconWallet size={40} />
        </ThemeIcon>
        <Title order={2}>Welcome to Budget App!</Title>
        <Text c="dimmed" ta="center" maw={400}>
          Create your first budget to start tracking your expenses with envelope budgeting.
        </Text>
        <Button
          component={Link}
          href="/dashboard/budgets/new"
          leftSection={<IconPlus size={20} />}
          size="lg"
        >
          Create Your First Budget
        </Button>
      </Stack>
    );
  }

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>{currentBudget.name}</Title>
          <Text c="dimmed">{currentBudget.description || "Your budget"}</Text>
        </div>
        <Group>
          <Button
            component={Link}
            href="/dashboard/expenses/new"
            leftSection={<IconReceipt size={18} />}
            variant="light"
          >
            Add Expense
          </Button>
          <Button
            component={Link}
            href="/dashboard/budgets/settings"
            variant="subtle"
          >
            Settings
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card withBorder>
          <Text size="sm" c="dimmed" fw={500}>
            Budget
          </Text>
          <Text size="xl" fw={700}>
            {formatCurrency(budgetAmount, currentBudget.currency)}
          </Text>
          <Text size="xs" c="dimmed">
            Total budget for this period
          </Text>
        </Card>

        <Card withBorder>
          <Text size="sm" c="dimmed" fw={500}>
            Spent
          </Text>
          <Text size="xl" fw={700} c={totalSpent > budgetAmount ? "red" : undefined}>
            {formatCurrency(totalSpent, currentBudget.currency)}
          </Text>
          <Progress
            value={Math.min(spentPercentage, 100)}
            color={spentPercentage > 100 ? "red" : spentPercentage > 80 ? "yellow" : "blue"}
            size="sm"
            mt="xs"
          />
        </Card>

        <Card withBorder>
          <Text size="sm" c="dimmed" fw={500}>
            Remaining
          </Text>
          <Text size="xl" fw={700} c={remaining < 0 ? "red" : "green"}>
            {formatCurrency(remaining, currentBudget.currency)}
          </Text>
          <Text size="xs" c="dimmed">
            {remaining >= 0 ? "Available to spend" : "Over budget"}
          </Text>
        </Card>
      </SimpleGrid>

      <Group justify="space-between" mt="lg">
        <Title order={3}>Envelopes</Title>
        <Button
          component={Link}
          href="/dashboard/envelopes/new"
          leftSection={<IconPlus size={18} />}
          variant="light"
          size="sm"
        >
          Add Envelope
        </Button>
      </Group>

      {envelopesLoading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          <Skeleton height={150} />
          <Skeleton height={150} />
          <Skeleton height={150} />
        </SimpleGrid>
      ) : envelopes.length === 0 ? (
        <Card withBorder p="xl">
          <Stack align="center">
            <Text c="dimmed">No envelopes yet</Text>
            <Button
              component={Link}
              href="/dashboard/envelopes/new"
              leftSection={<IconPlus size={18} />}
              variant="light"
            >
              Create your first envelope
            </Button>
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {envelopes.map((envelope) => {
            const envelopeExpenses = expenses.filter(
              (e) => e.envelopeId === envelope.id
            );
            const envelopeSpent = envelopeExpenses.reduce(
              (sum, e) => sum + Number(e.amount),
              0
            );
            const envelopeAllocation = Number(envelope.allocation);
            const envelopeRemaining = envelopeAllocation - envelopeSpent;
            const envelopePercentage =
              envelopeAllocation > 0
                ? (envelopeSpent / envelopeAllocation) * 100
                : 0;

            return (
              <Card
                key={envelope.id}
                withBorder
                component={Link}
                href={`/dashboard/envelopes/${envelope.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Group justify="space-between" mb="xs">
                  <Text fw={500}>{envelope.name}</Text>
                  <Badge
                    color={
                      envelopePercentage > 100
                        ? "red"
                        : envelopePercentage > 80
                          ? "yellow"
                          : "blue"
                    }
                    variant="light"
                  >
                    {Math.round(envelopePercentage)}%
                  </Badge>
                </Group>

                <Progress
                  value={Math.min(envelopePercentage, 100)}
                  color={
                    envelopePercentage > 100
                      ? "red"
                      : envelopePercentage > 80
                        ? "yellow"
                        : "blue"
                  }
                  size="lg"
                  mb="xs"
                />

                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed">
                      Spent
                    </Text>
                    <Text fw={500}>
                      {formatCurrency(envelopeSpent, currentBudget.currency)}
                    </Text>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Text size="sm" c="dimmed">
                      Remaining
                    </Text>
                    <Text
                      fw={500}
                      c={envelopeRemaining < 0 ? "red" : "green"}
                    >
                      {formatCurrency(envelopeRemaining, currentBudget.currency)}
                    </Text>
                  </div>
                </Group>

                {envelope.description && (
                  <Text size="xs" c="dimmed" mt="xs" lineClamp={1}>
                    {envelope.description}
                  </Text>
                )}
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <Text size="sm" c="dimmed" mt="lg">
        Total allocated: {formatCurrency(totalAllocated, currentBudget.currency)} of{" "}
        {formatCurrency(budgetAmount, currentBudget.currency)}
        {totalAllocated > budgetAmount && (
          <Text span c="red" ml="xs">
            (Over-allocated by {formatCurrency(totalAllocated - budgetAmount, currentBudget.currency)})
          </Text>
        )}
      </Text>
    </Stack>
  );
}
