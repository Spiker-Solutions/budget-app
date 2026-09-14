"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
  Alert,
} from "@mantine/core";
import { IconPlus, IconWallet, IconReceipt, IconTarget } from "@tabler/icons-react";
import Link from "next/link";
import { useBudgetStore } from "@/stores/budgetStore";
import { useEnvelopeStore } from "@/stores/envelopeStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { useUiStore } from "@/stores/uiStore";
import { useSession } from "next-auth/react";
import { canManageBudget, getMembershipRole } from "@/lib/permissions";
import { formatCurrency } from "@/lib/client-utils";
import { type EnvelopePeriodTotals, resolveEnvelopeAllocation } from "@/lib/budget-period";
import { useBudgetPeriodView } from "@/hooks/useBudgetPeriodView";
import { PeriodNavigator } from "@/components/shared/PeriodNavigator";
import { EnvelopeIcon } from "@/components/envelopes/EnvelopeIcon";
import { useGoalStore } from "@/stores/goalStore";
import { useGoalProgress } from "@/hooks/useGoalProgress";
import type { Goal } from "@/types";
import { RemainderWizardModal } from "@/components/goals/RemainderWizardModal";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { budgets, isLoading: budgetsLoading } = useBudgetStore();
  const { envelopes, fetchEnvelopes, isLoading: envelopesLoading } = useEnvelopeStore();
  const { expenses, fetchExpenses } = useExpenseStore();
  const { goals, fetchGoals } = useGoalStore();
  const { currentBudgetId } = useUiStore();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardBanner, setWizardBanner] = useState(false);
  const [wizardPeriod, setWizardPeriod] = useState<{ start: string; end: string } | null>(
    null
  );
  const [showPeriodWizardButton, setShowPeriodWizardButton] = useState(false);

  const {
    currentBudget,
    periodTotals,
    referenceDate,
    isCurrentPeriod,
    canGoPrevious,
    canGoNext,
    hasMultiplePeriods,
    viewableDateRange,
    goToPreviousPeriod,
    goToNextPeriod,
    goToCurrentPeriod,
    goToPeriodContainingDate,
  } = useBudgetPeriodView(envelopes, expenses);

  const refreshWizardHint = useCallback(async () => {
    if (!currentBudgetId) return;
    const qs = referenceDate
      ? `?referenceDate=${encodeURIComponent(referenceDate.toISOString())}`
      : "";
    const res = await fetch(
      `/api/budgets/${currentBudgetId}/remainder-wizard${qs}`
    );
    const json = await res.json();
    if (json.success && json.data.period) {
      setWizardPeriod(json.data.period);
      setWizardBanner(Boolean(json.data.showBanner));
      setShowPeriodWizardButton(Boolean(json.data.showPeriodButton));
    } else {
      setWizardBanner(false);
      setShowPeriodWizardButton(false);
    }
  }, [currentBudgetId, referenceDate]);

  useEffect(() => {
    if (currentBudgetId) {
      fetchEnvelopes(currentBudgetId);
      fetchExpenses(undefined, currentBudgetId);
      fetchGoals(currentBudgetId);
    }
  }, [currentBudgetId, fetchEnvelopes, fetchExpenses, fetchGoals]);

  useEffect(() => {
    void refreshWizardHint();
  }, [refreshWizardHint]);

  const totalAllocated = periodTotals?.totalBaseAllocation ?? 0;

  const envelopeTotalsById = useMemo(() => {
    const m = new Map<string, EnvelopePeriodTotals>();
    if (periodTotals) {
      for (const t of periodTotals.envelopeTotals) {
        m.set(t.envelopeId, t);
      }
    }
    return m;
  }, [periodTotals]);

  const budgetAmount = currentBudget ? Number(currentBudget.amount) : 0;
  const userRole = getMembershipRole(currentBudget?.members, session?.user?.id);
  const canManageBudgetSettings = canManageBudget(userRole);
  const totalAvailableThisPeriod = periodTotals?.totalAvailableThisPeriod ?? 0;
  const totalCarriedFromPrior = periodTotals?.totalCarriedFromPrior ?? 0;
  const totalSpentThisPeriod = periodTotals?.totalSpentThisPeriod ?? 0;
  const totalGrossSpentThisPeriod =
    periodTotals?.totalGrossSpentThisPeriod ?? totalSpentThisPeriod;
  const totalRefundedThisPeriod = periodTotals?.totalRefundedThisPeriod ?? 0;
  const totalRemainingThisPeriod = periodTotals?.totalRemainingThisPeriod ?? 0;
  const spentPercentage =
    totalAvailableThisPeriod > 0
      ? (totalSpentThisPeriod / totalAvailableThisPeriod) * 100
      : 0;

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
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>{currentBudget.name}</Title>
          <Text c="dimmed">{currentBudget.description || "Your budget"}</Text>
          {periodTotals && viewableDateRange && (
            <Group mt="sm">
              <PeriodNavigator
                period={periodTotals.currentPeriod}
                referenceDate={referenceDate}
                isCurrentPeriod={isCurrentPeriod}
                canGoPrevious={canGoPrevious}
                canGoNext={canGoNext}
                hasMultiplePeriods={hasMultiplePeriods}
                minDate={viewableDateRange.min}
                maxDate={viewableDateRange.max}
                onPrevious={goToPreviousPeriod}
                onNext={goToNextPeriod}
                onCurrent={goToCurrentPeriod}
                onSelectDate={goToPeriodContainingDate}
              />
            </Group>
          )}
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
          {canManageBudgetSettings && (
            <Button
              component={Link}
              href="/dashboard/budgets/settings"
              variant="subtle"
            >
              Settings
            </Button>
          )}
        </Group>
      </Group>

      {wizardBanner && (
        <Alert
          title="Leftover envelope funds"
          color="teal"
          variant="light"
          withCloseButton
          onClose={async () => {
            if (!currentBudgetId || !wizardPeriod) return;
            await fetch(`/api/budgets/${currentBudgetId}/remainder-wizard`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "dismiss",
                budgetId: currentBudgetId,
                periodStart: wizardPeriod.start,
                periodEnd: wizardPeriod.end,
              }),
            });
            setWizardBanner(false);
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm">
              The last period had unspent envelope funds. Allocate them to savings goals?
            </Text>
            <Button size="xs" onClick={() => setWizardOpen(true)}>
              Open wizard
            </Button>
          </Group>
        </Alert>
      )}

      {!isCurrentPeriod && showPeriodWizardButton && (
        <Button variant="light" onClick={() => setWizardOpen(true)}>
          Allocate remainders for this period
        </Button>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card withBorder>
          <Text size="sm" c="dimmed" fw={500}>
            Envelope total{isCurrentPeriod ? " (this period)" : ""}
          </Text>
          <Text size="xl" fw={700}>
            {formatCurrency(totalAvailableThisPeriod, currentBudget.currency)}
          </Text>
          <Text size="xs" c="dimmed">
            {formatCurrency(totalAllocated, currentBudget.currency)} base
            {totalCarriedFromPrior > 0 && (
              <>
                {" "}
                + {formatCurrency(totalCarriedFromPrior, currentBudget.currency)} carried over
              </>
            )}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Planned budget: {formatCurrency(budgetAmount, currentBudget.currency)}
          </Text>
        </Card>

        <Card withBorder>
          <Text size="sm" c="dimmed" fw={500}>
            Spent{isCurrentPeriod ? " (this period)" : ""}
          </Text>
          <Text
            size="xl"
            fw={700}
            c={totalSpentThisPeriod > totalAvailableThisPeriod ? "red" : undefined}
          >
            {formatCurrency(totalSpentThisPeriod, currentBudget.currency)}
          </Text>
          {totalRefundedThisPeriod > 0 && (
            <Text size="xs" c="dimmed">
              {formatCurrency(totalGrossSpentThisPeriod, currentBudget.currency)} less{" "}
              {formatCurrency(totalRefundedThisPeriod, currentBudget.currency)} refunded
            </Text>
          )}
          <Progress
            value={Math.min(spentPercentage, 100)}
            color={spentPercentage > 100 ? "red" : spentPercentage > 80 ? "yellow" : "blue"}
            size="sm"
            mt="xs"
          />
        </Card>

        <Card withBorder>
          <Text size="sm" c="dimmed" fw={500}>
            Remaining{isCurrentPeriod ? " (this period)" : ""}
          </Text>
          <Text size="xl" fw={700} c={totalRemainingThisPeriod < 0 ? "red" : "green"}>
            {formatCurrency(totalRemainingThisPeriod, currentBudget.currency)}
          </Text>
          <Text size="xs" c="dimmed">
            {totalRemainingThisPeriod >= 0 ? "Available to spend" : "Over envelope total"}
          </Text>
        </Card>
      </SimpleGrid>

      <Group justify="space-between" mt="lg">
        <Title order={3}>Goals</Title>
        {canManageBudgetSettings && (
          <Button
            component={Link}
            href="/dashboard/goals/new"
            leftSection={<IconPlus size={18} />}
            variant="light"
            size="sm"
          >
            Add goal
          </Button>
        )}
      </Group>

      {goals.length === 0 ? (
        <Card withBorder mb="lg">
          <Text c="dimmed" size="sm">
            No goals yet. Create a saving or debt payoff goal to track progress.
          </Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="xl">
          {goals.map((goal) => (
            <GoalDashboardCard
              key={goal.id}
              goal={goal}
              expenses={expenses.filter((e) => e.goalId === goal.id)}
              currency={currentBudget.currency}
            />
          ))}
        </SimpleGrid>
      )}

      <Group justify="space-between" mt="lg">
        <Title order={3}>Envelopes</Title>
        {canManageBudgetSettings && (
          <Button
            component={Link}
            href="/dashboard/envelopes/new"
            leftSection={<IconPlus size={18} />}
            variant="light"
            size="sm"
          >
            Add Envelope
          </Button>
        )}
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
            {canManageBudgetSettings && (
              <Button
                component={Link}
                href="/dashboard/envelopes/new"
                leftSection={<IconPlus size={18} />}
                variant="light"
              >
                Create your first envelope
              </Button>
            )}
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {envelopes.map((envelope) => {
            const envT = envelopeTotalsById.get(envelope.id);
            const envelopeSpent = envT?.spentThisPeriod ?? 0;
            const envelopeAvailable =
              envT?.availableThisPeriod ??
              resolveEnvelopeAllocation(
                Number(envelope.allocation),
                envelope.allocationType ?? "AMOUNT",
                budgetAmount
              );
            const envelopeRemaining = envT?.remainingThisPeriod ?? envelopeAvailable - envelopeSpent;
            const envelopePercentage =
              envelopeAvailable > 0 ? (envelopeSpent / envelopeAvailable) * 100 : 0;

            return (
              <Card
                key={envelope.id}
                withBorder
                component={Link}
                href={`/dashboard/envelopes/${envelope.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <EnvelopeIcon icon={envelope.icon} color={envelope.color} size={16} />
                    <Text fw={500}>{envelope.name}</Text>
                  </Group>
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

      {currentBudgetId && (
        <RemainderWizardModal
          budgetId={currentBudgetId}
          currency={currentBudget.currency}
          opened={wizardOpen}
          onClose={() => setWizardOpen(false)}
          referenceDateIso={referenceDate.toISOString()}
          onComplete={() => {
            fetchExpenses(undefined, currentBudgetId);
            void refreshWizardHint();
          }}
        />
      )}
    </Stack>
  );
}

function GoalDashboardCard({
  goal,
  expenses,
  currency,
}: {
  goal: Goal;
  expenses: Parameters<typeof useGoalProgress>[1];
  currency: string;
}) {
  const { currentAmount, progressPercent, label } = useGoalProgress(goal, expenses, []);

  return (
    <Card
      withBorder
      component={Link}
      href={`/dashboard/goals/${goal.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <ThemeIcon variant="light" color="teal" size="md">
            <IconTarget size={16} />
          </ThemeIcon>
          <Text fw={500}>{goal.name}</Text>
        </Group>
        <Badge color="teal" variant="light">
          {goal.type === "SAVE" ? "Save" : "Debt"}
        </Badge>
      </Group>
      <Progress value={Math.min(progressPercent, 100)} color="teal" size="lg" mb="xs" />
      <Text size="sm">
        {formatCurrency(currentAmount, currency)} {label} /{" "}
        {formatCurrency(Number(goal.targetAmount), currency)} target
      </Text>
    </Card>
  );
}
