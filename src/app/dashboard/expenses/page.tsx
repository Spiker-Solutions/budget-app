"use client";

import { useEffect } from "react";
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
import { IconPlus, IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useExpenseStore } from "@/stores/expenseStore";
import { useUiStore } from "@/stores/uiStore";
import { useBudgetStore } from "@/stores/budgetStore";
import { formatCurrency } from "@/lib/client-utils";
import dayjs from "dayjs";

export default function ExpensesPage() {
  const { expenses, fetchExpenses, deleteExpense, isLoading } = useExpenseStore();
  const { currentBudgetId } = useUiStore();
  const { budgets } = useBudgetStore();

  const currentBudget = budgets.find((b) => b.id === currentBudgetId);

  useEffect(() => {
    if (currentBudgetId) {
      fetchExpenses(undefined, currentBudgetId);
    }
  }, [currentBudgetId, fetchExpenses]);

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
      <Group justify="space-between">
        <div>
          <Title order={2}>Expenses</Title>
          <Text c="dimmed">
            Track all your expenses for {currentBudget.name}
          </Text>
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
      ) : expenses.length === 0 ? (
        <Card withBorder p="xl">
          <Stack align="center">
            <Text c="dimmed">No expenses yet</Text>
            <Button
              component={Link}
              href="/dashboard/expenses/new"
              leftSection={<IconPlus size={18} />}
              variant="light"
            >
              Add your first expense
            </Button>
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
                <Table.Th style={{ textAlign: "right" }}>Amount</Table.Th>
                <Table.Th style={{ width: "50px" }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {expenses.map((expense) => (
                <Table.Tr key={expense.id}>
                  <Table.Td>
                    {dayjs(expense.date).format("MMM D, YYYY")}
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{expense.payee.name}</Text>
                    {expense.location && (
                      <Text size="xs" c="dimmed">
                        {expense.location}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {expense.envelope ? (
                      <Badge variant="light">{expense.envelope.name}</Badge>
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
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text fw={500}>
                      {formatCurrency(
                        Number(expense.amount),
                        currentBudget.currency
                      )}
                    </Text>
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
          Total: {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
        </Text>
        <Text size="sm" fw={500}>
          Total spent:{" "}
          {formatCurrency(
            expenses.reduce((sum, e) => sum + Number(e.amount), 0),
            currentBudget.currency
          )}
        </Text>
      </Group>
    </Stack>
  );
}
