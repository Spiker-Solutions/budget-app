"use client";

import { useState, useEffect } from "react";
import {
  Title,
  Text,
  Card,
  Stack,
  NumberInput,
  Textarea,
  TextInput,
  Button,
  Group,
  Select,
  Autocomplete,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useExpenseStore } from "@/stores/expenseStore";
import { useEnvelopeStore } from "@/stores/envelopeStore";
import { useUiStore } from "@/stores/uiStore";
import type { CreateExpenseInput } from "@/types";

const recurrenceOptions = [
  { value: "NONE", label: "None" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

export default function NewExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [payeeOptions, setPayeeOptions] = useState<string[]>([]);
  const { createExpense, fetchExpenses } = useExpenseStore();
  const { envelopes, fetchEnvelopes } = useEnvelopeStore();
  const { currentBudgetId } = useUiStore();

  useEffect(() => {
    if (currentBudgetId) {
      fetchEnvelopes(currentBudgetId);
      fetchPayees();
    }
  }, [currentBudgetId, fetchEnvelopes]);

  const fetchPayees = async () => {
    if (!currentBudgetId) return;

    try {
      const response = await fetch(
        `/api/payees?budgetId=${currentBudgetId}`
      );
      if (response.ok) {
        const data = await response.json();
        setPayeeOptions(data.data.map((p: { name: string }) => p.name));
      }
    } catch (error) {
      console.error("Failed to fetch payees:", error);
    }
  };

  const form = useForm<Omit<CreateExpenseInput, "budgetId">>({
    initialValues: {
      amount: 0,
      payee: "",
      description: "",
      location: "",
      envelopeId: "",
      date: new Date(),
      recurrence: "NONE",
    },
    validate: {
      amount: (value) => (value <= 0 ? "Amount must be greater than 0" : null),
      payee: (value) => (value.length < 1 ? "Payee is required" : null),
      envelopeId: (value) => (!value || value.length < 1 ? "Envelope is required" : null),
    },
  });

  const handleSubmit = async (
    values: Omit<CreateExpenseInput, "budgetId">
  ) => {
    if (!currentBudgetId) {
      notifications.show({
        title: "Error",
        message: "Please select a budget first",
        color: "red",
      });
      return;
    }

    setLoading(true);

    try {
      const expense = await createExpense({
        ...values,
        budgetId: currentBudgetId,
        envelopeId: values.envelopeId,
      });

      if (expense) {
        notifications.show({
          title: "Expense added",
          message: `$${expense.amount} expense at "${expense.payee.name}" has been recorded`,
          color: "green",
        });
        await fetchExpenses(undefined, currentBudgetId);
        router.push("/dashboard");
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to add expense",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "An unexpected error occurred",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentBudgetId) {
    return (
      <Stack>
        <Title order={2}>Add New Expense</Title>
        <Text c="red">Please select a budget first</Text>
      </Stack>
    );
  }

  const envelopeOptions = envelopes.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  return (
    <Stack>
      <Title order={2}>Add New Expense</Title>
      <Text c="dimmed">Record a new expense for your budget.</Text>

      <Card withBorder maw={600}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <NumberInput
              label="Amount"
              placeholder="0.00"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              prefix="$"
              thousandSeparator=","
              {...form.getInputProps("amount")}
            />

            <Autocomplete
              label="Payee"
              placeholder="Where did you spend?"
              required
              data={payeeOptions}
              {...form.getInputProps("payee")}
            />

            <Select
              label="Envelope"
              placeholder="Select an envelope"
              data={envelopeOptions}
              required
              searchable
              {...form.getInputProps("envelopeId")}
            />

            <DatePickerInput
              label="Date"
              placeholder="Pick date"
              {...form.getInputProps("date")}
            />

            <Select
              label="Recurrence"
              data={recurrenceOptions}
              {...form.getInputProps("recurrence")}
            />

            <TextInput
              label="Location"
              placeholder="Optional location"
              {...form.getInputProps("location")}
            />

            <Textarea
              label="Description"
              placeholder="Optional notes about this expense"
              {...form.getInputProps("description")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Add Expense
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
