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
  SegmentedControl,
} from "@mantine/core";
import { DateField } from "@/components/shared/DateField";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter, useSearchParams } from "next/navigation";
import { AmountInput } from "@/components/shared/AmountInput";
import { useExpenseStore } from "@/stores/expenseStore";
import { useEnvelopeStore } from "@/stores/envelopeStore";
import { useGoalStore } from "@/stores/goalStore";
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
  const goalIdParam = searchParams.get("goalId") ?? "";
  const modeParam = searchParams.get("mode") ?? "";
  const initialMode = modeParam === "contribution" || goalIdParam ? "contribution" : "expense";
  const [loading, setLoading] = useState(false);
  const [payeeOptions, setPayeeOptions] = useState<string[]>([]);
  const { createExpense, fetchExpenses } = useExpenseStore();
  const { envelopes, fetchEnvelopes } = useEnvelopeStore();
  const { goals, fetchGoals } = useGoalStore();
  const { currentBudgetId } = useUiStore();
  const [transactionMode, setTransactionMode] = useState<"expense" | "contribution">(
    initialMode as "expense" | "contribution"
  );
  // Tracks which button triggered the submit so we know whether to stay on
  // the page (to add another expense) or navigate away.
  const addAnotherRef = useRef(false);

  useEffect(() => {
    if (currentBudgetId) {
      fetchEnvelopes(currentBudgetId);
      fetchGoals(currentBudgetId);
      fetchPayees();
    }
  }, [currentBudgetId, fetchEnvelopes, fetchGoals]);

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

  const form = useForm<Omit<CreateExpenseInput, "budgetId"> & { goalId?: string }>({
    initialValues: {
      amount: 0,
      payee: "",
      description: "",
      location: "",
      envelopeId: envelopeIdParam,
      date: new Date(),
      recurrence: "NONE",
      recurrenceEndDate: null,
      goalId: goalIdParam,
    },
    validate: {
      amount: (value) => (value <= 0 ? "Amount must be greater than 0" : null),
      payee: (value) =>
        transactionMode === "expense" && (value ?? "").length < 1 ? "Payee is required" : null,
      envelopeId: (value) => (!value || value.length < 1 ? "Envelope is required" : null),
      goalId: (value, values) => {
        if (transactionMode === "contribution" && (!value || value.length < 1)) {
          return "Goal is required for contributions";
        }
        return null;
      },
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
      const selectedGoal =
        transactionMode === "contribution"
          ? goals.find((g) => g.id === values.goalId)
          : null;

      const expense = await createExpense({
        ...values,
        budgetId: currentBudgetId,
        envelopeId: values.envelopeId,
        goalId: transactionMode === "contribution" ? values.goalId : null,
        payee:
          transactionMode === "contribution" && selectedGoal
            ? selectedGoal.name
            : values.payee,
      });

      if (expense) {
        notifications.show({
          title: transactionMode === "contribution" ? "Contribution added" : "Expense added",
          message:
            transactionMode === "contribution"
              ? `$${expense.amount} toward "${expense.payee.name}"`
              : `$${expense.amount} expense at "${expense.payee.name}" has been recorded`,
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
  const isRecurring = form.values.recurrence !== "NONE";

  return (
    <Stack>
      <Title order={2}>Add transaction</Title>
      <Text c="dimmed">Record spending or a contribution toward a goal.</Text>

      <Card withBorder maw={600}>
        <form
          onSubmit={form.onSubmit((values) => {
            void handleSubmit(values);
          })}
        >
          <Stack>
            <SegmentedControl
              value={transactionMode}
              onChange={(v) => setTransactionMode(v as "expense" | "contribution")}
              data={[
                { label: "Expense", value: "expense" },
                { label: "Goal contribution", value: "contribution" },
              ]}
            />

            {transactionMode === "contribution" && (
              <Select
                label="Goal"
                placeholder="Select a save or debt goal"
                data={goals.map((g) => ({
                  value: g.id,
                  label: `${g.name} (${g.type === "SAVE" ? "Save" : "Debt"})`,
                }))}
                required
                searchable
                {...form.getInputProps("goalId")}
              />
            )}

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

            {transactionMode === "expense" ? (
              <Autocomplete
                label="Payee"
                placeholder="Where did you spend?"
                required
                data={payeeOptions}
                {...form.getInputProps("payee")}
              />
            ) : (
              <Text size="sm" c="dimmed">
                Payee:{" "}
                {goals.find((g) => g.id === form.values.goalId)?.name ??
                  "Select a goal — the goal name is used as the payee"}
              </Text>
            )}

            <Select
              label="Envelope"
              placeholder="Select an envelope"
              data={envelopeOptions}
              required
              searchable
              {...form.getInputProps("envelopeId")}
            />

            <DateField
              label="Date"
              description={
                isRecurring
                  ? "First occurrence date — future repeats are calculated from this day"
                  : "Type MM/DD/YYYY or pick from the calendar"
              }
              {...form.getInputProps("date")}
            />

            <Select
              label="Recurrence"
              description="Recurring expenses count in every budget period where they occur"
              data={recurrenceOptions}
              {...form.getInputProps("recurrence")}
            />

            {isRecurring && (
              <DateField
                label="End date"
                description="Optional — leave blank to repeat indefinitely"
                clearable
                {...form.getInputProps("recurrenceEndDate")}
              />
            )}

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
