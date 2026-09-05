"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import {
  Title,
  Text,
  Card,
  Stack,
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
import { useRouter, useSearchParams } from "next/navigation";
import { AmountInput } from "@/components/shared/AmountInput";
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

function NewExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const envelopeIdParam = searchParams.get("envelopeId") ?? "";
  const [loading, setLoading] = useState(false);
  const [payeeOptions, setPayeeOptions] = useState<string[]>([]);
  const { createExpense, fetchExpenses } = useExpenseStore();
  const { envelopes, fetchEnvelopes } = useEnvelopeStore();
  const { currentBudgetId } = useUiStore();
  // Tracks which button triggered the submit so we know whether to stay on
  // the page (to add another expense) or navigate away.
  const addAnotherRef = useRef(false);

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
      envelopeId: envelopeIdParam,
      date: new Date(),
      recurrence: "NONE",
    },
    validate: {
      amount: (value) => (value <= 0 ? "Amount must be greater than 0" : null),
      payee: (value) => (value.length < 1 ? "Payee is required" : null),
      envelopeId: (value) => (!value || value.length < 1 ? "Envelope is required" : null),
    },
  });

  // Keep the envelope field in sync when arriving from an envelope page.
  useEffect(() => {
    if (envelopeIdParam) {
      form.setFieldValue("envelopeId", envelopeIdParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopeIdParam]);

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

    const addAnother = addAnotherRef.current;
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

        if (addAnother) {
          // Reset the form for the next entry but keep the envelope and date
          // so multiple expenses can be added quickly to the same envelope.
          const keepEnvelopeId = values.envelopeId;
          const keepDate = values.date;
          form.reset();
          form.setFieldValue("envelopeId", keepEnvelopeId);
          form.setFieldValue("date", keepDate ?? new Date());
        } else {
          router.push(
            envelopeIdParam
              ? `/dashboard/envelopes/${envelopeIdParam}`
              : "/dashboard"
          );
        }
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
        <form
          onSubmit={form.onSubmit((values) => {
            void handleSubmit(values);
          })}
        >
          <Stack>
            <AmountInput
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
              <Button
                variant="subtle"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="light"
                loading={loading}
                onClick={() => {
                  addAnotherRef.current = true;
                }}
              >
                Save &amp; Add Another
              </Button>
              <Button
                type="submit"
                loading={loading}
                onClick={() => {
                  addAnotherRef.current = false;
                }}
              >
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense fallback={null}>
      <NewExpenseForm />
    </Suspense>
  );
}
