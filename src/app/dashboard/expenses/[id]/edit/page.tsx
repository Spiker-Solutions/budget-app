"use client";

import { useEffect, useState } from "react";
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
  Skeleton,
} from "@mantine/core";
import { DateField } from "@/components/shared/DateField";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { AmountInput } from "@/components/shared/AmountInput";
import { useExpenseStore } from "@/stores/expenseStore";
import { useEnvelopeStore } from "@/stores/envelopeStore";
import { useUiStore } from "@/stores/uiStore";
import type { ExpenseWithRelations, UpdateExpenseInput } from "@/types";

const recurrenceOptions = [
  { value: "NONE", label: "None" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

type ExpenseEditFormValues = {
  amount: number;
  payee: string;
  description: string;
  location: string;
  envelopeId: string;
  date: Date;
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
};

export default function EditExpensePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expense, setExpense] = useState<ExpenseWithRelations | null>(null);
  const [payeeOptions, setPayeeOptions] = useState<string[]>([]);
  const { updateExpense, fetchExpenses } = useExpenseStore();
  const { envelopes, fetchEnvelopes } = useEnvelopeStore();
  const { currentBudgetId } = useUiStore();

  const form = useForm<ExpenseEditFormValues>({
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
      envelopeId: (value) =>
        !value || value.length < 1 ? "Envelope is required" : null,
    },
  });

  useEffect(() => {
    const fetchExpense = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/expenses/${params.id}`);
        if (!response.ok) {
          notifications.show({
            title: "Error",
            message: "Expense not found",
            color: "red",
          });
          router.push("/dashboard/expenses");
          return;
        }

        const data = await response.json();
        const expenseData: ExpenseWithRelations = data.data;
        setExpense(expenseData);

        const budgetId = expenseData.envelope?.budgetId;
        if (budgetId) {
          fetchEnvelopes(budgetId);
          try {
            const payeesRes = await fetch(`/api/payees?budgetId=${budgetId}`);
            if (payeesRes.ok) {
              const payeesData = await payeesRes.json();
              setPayeeOptions(
                payeesData.data.map((p: { name: string }) => p.name)
              );
            }
          } catch (error) {
            console.error("Failed to fetch payees:", error);
          }
        }

        form.setValues({
          amount: Number(expenseData.amount),
          payee: expenseData.payee?.name ?? "",
          description: expenseData.description ?? "",
          location: expenseData.location ?? "",
          envelopeId: expenseData.envelopeId ?? "",
          date: new Date(expenseData.date),
          recurrence: expenseData.recurrence ?? "NONE",
        });
      } catch (error) {
        console.error("Failed to fetch expense:", error);
        router.push("/dashboard/expenses");
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  const handleSubmit = async (values: ExpenseEditFormValues) => {
    setSaving(true);

    try {
      const payload: UpdateExpenseInput = {
        amount: values.amount,
        payee: values.payee,
        description: values.description || undefined,
        location: values.location || undefined,
        envelopeId: values.envelopeId,
        date: values.date,
        recurrence: values.recurrence,
      };

      const updated = await updateExpense(params.id, payload);

      if (updated) {
        notifications.show({
          title: "Expense updated",
          message: `Expense at "${updated.payee.name}" has been updated`,
          color: "green",
        });
        if (currentBudgetId) {
          await fetchExpenses(undefined, currentBudgetId);
        }
        router.push("/dashboard/expenses");
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to update expense",
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
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack>
        <Skeleton height={40} width={300} />
        <Skeleton height={400} />
      </Stack>
    );
  }

  if (!expense) {
    return (
      <Stack>
        <Title order={2}>Expense not found</Title>
        <Button
          component={Link}
          href="/dashboard/expenses"
          leftSection={<IconArrowLeft size={18} />}
        >
          Back to Expenses
        </Button>
      </Stack>
    );
  }

  const envelopeOptions = envelopes.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  return (
    <Stack>
      <Group justify="space-between">
        <Button
          component={Link}
          href="/dashboard/expenses"
          variant="subtle"
          leftSection={<IconArrowLeft size={18} />}
        >
          Back to Expenses
        </Button>
      </Group>

      <Title order={2}>Edit Expense</Title>
      <Text c="dimmed">Update the details for this expense.</Text>

      <Card withBorder maw={600}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
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

            <DateField
              label="Date"
              description="Type MM/DD/YYYY or pick from the calendar"
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
              <Button type="submit" loading={saving}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
