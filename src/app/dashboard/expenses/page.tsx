"use client";

import { useEffect, useMemo } from "react";
import {
  Title,
  Text,
  Card,
  Stack,
  Group,
  Button,
  Table,
  Badge,
  Skeleton,
  ActionIcon,
  Menu,
} from "@mantine/core";
import {
  IconPlus,
  IconDots,
  IconEdit,
  IconReceiptRefund,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useExpenseStore } from "@/stores/expenseStore";
import { useUiStore } from "@/stores/uiStore";
import { formatCurrency } from "@/lib/client-utils";
import { filterExpensesInRange } from "@/lib/budget-period";
import { getRefundSummary, roundMoney } from "@/lib/refunds";
import { useBudgetPeriodView } from "@/hooks/useBudgetPeriodView";
import { PeriodNavigator } from "@/components/shared/PeriodNavigator";
import { ExpenseCreatorBadge } from "@/components/expenses/ExpenseCreatorBadge";
import { ExpenseAmountCell } from "@/components/refunds/ExpenseAmountCell";
import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import { EnvelopeIcon } from "@/components/envelopes/EnvelopeIcon";
import dayjs from "dayjs";

export default function ExpensesPage() {
  const { expenses, fetchExpenses, deleteExpense, isLoading } = useExpenseStore();
  const { currentBudgetId } = useUiStore();

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
  } = useBudgetPeriodView([], expenses);

  useEffect(() => {
    if (currentBudgetId) {
      fetchExpenses(undefined, currentBudgetId);
    }
  }, [currentBudgetId, fetchExpenses]);

  const periodExpenses = useMemo(() => {
    if (!periodTotals) return expenses;
    return filterExpensesInRange(
      expenses.map((e) => ({
        ...e,
        envelopeId: e.envelopeId,
        date: new Date(e.date),
        amount: Number(e.amount),
      })),
      periodTotals.currentPeriod
    );
  }, [expenses, periodTotals]);

  const periodSummary = useMemo(() => {
    const totals = periodExpenses.reduce(
      (acc, expense) => {
        const { grossAmount, refundedTotal, netAmount } = getRefundSummary(expense);
        return {
          gross: acc.gross + grossAmount,
          refunded: acc.refunded + refundedTotal,
          net: acc.net + netAmount,
        };
      },
      { gross: 0, refunded: 0, net: 0 }
    );

    return {
      gross: roundMoney(totals.gross),
      refunded: roundMoney(totals.refunded),
      net: roundMoney(totals.net),
    };
  }, [periodExpenses]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      await deleteExpense(id);
      if (currentBudgetId) {
        await fetchExpenses(undefined, currentBudgetId);
      }
    }
  };

  if (!currentBudgetId || !currentBudget) {
    return (
      <Stack>
        <Title order={2}>Expenses</Title>
        <Text c="red">Please select a budget first</Text>
      </Stack>
    );
  }

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Expenses</Title>
          <Text c="dimmed">
            {isCurrentPeriod
              ? `Track all your expenses for ${currentBudget.name}`
              : `Expenses for ${currentBudget.name} in the selected period`}
          </Text>
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
        <Button
          component={Link}
          href="/dashboard/expenses/new"
          leftSection={<IconPlus size={18} />}
        >
          Add Expense
        </Button>
      </Group>

      {isLoading ? (
        <Card withBorder>
          <Stack>
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </Stack>
        </Card>
      ) : periodExpenses.length === 0 ? (
        <Card withBorder p="xl">
          <Stack align="center">
            <Text c="dimmed">
              {isCurrentPeriod
                ? "No expenses yet"
                : "No expenses in this period"}
            </Text>
            {isCurrentPeriod && (
              <Button
                component={Link}
                href="/dashboard/expenses/new"
                leftSection={<IconPlus size={18} />}
                variant="light"
              >
                Add your first expense
              </Button>
            )}
          </Stack>
        </Card>
      ) : (
        <Card withBorder p={0}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Payee</Table.Th>
                <Table.Th>Envelope</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Added by</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Amount</Table.Th>
                <Table.Th style={{ width: "50px" }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {periodExpenses.map((expense) => (
                <Table.Tr key={expense.id}>
                  <Table.Td>
                    {dayjs(expense.date).format("MMM D, YYYY")}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text fw={500}>{expense.payee.name}</Text>
                      <RefundStatusBadge
                        status={getRefundSummary(expense).status}
                      />
                    </Group>
                    {expense.location && (
                      <Text size="xs" c="dimmed">
                        {expense.location}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {expense.envelope ? (
                      <Group gap="xs" wrap="nowrap">
                        <EnvelopeIcon icon={expense.envelope.icon} color={expense.envelope.color} size={16} />
                        <Badge variant="light">{expense.envelope.name}</Badge>
                      </Group>
                    ) : (
                      <Text c="dimmed" size="sm">
                        Unassigned
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1}>
                      {expense.description || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {expense.createdBy ? (
                      <ExpenseCreatorBadge user={expense.createdBy} />
                    ) : (
                      <Text c="dimmed" size="sm">
                        -
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <ExpenseAmountCell
                      expense={expense}
                      currency={currentBudget.currency}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          component={Link}
                          href={`/dashboard/expenses/${expense.id}/edit`}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconReceiptRefund size={14} />}
                          component={Link}
                          href={`/dashboard/expenses/${expense.id}/edit#refunds`}
                        >
                          Refunds
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={() => handleDelete(expense.id)}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {periodExpenses.length} expense{periodExpenses.length !== 1 ? "s" : ""}
          {!isCurrentPeriod && " in this period"}
        </Text>
        <div style={{ textAlign: "right" }}>
          <Text size="sm" fw={500}>
            Total spent:{" "}
            {formatCurrency(periodSummary.net, currentBudget.currency)}
          </Text>
          {periodSummary.refunded > 0 && (
            <Text size="xs" c="dimmed">
              {formatCurrency(periodSummary.gross, currentBudget.currency)} less{" "}
              {formatCurrency(periodSummary.refunded, currentBudget.currency)} refunded
            </Text>
          )}
        </div>
      </Group>
    </Stack>
  );
}
