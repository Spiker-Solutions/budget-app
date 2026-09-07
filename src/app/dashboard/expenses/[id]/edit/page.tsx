"use client";

import { useEffect, useRef, useState } from "react";
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
  Modal,
  Alert,
} from "@mantine/core";
import { DateField } from "@/components/shared/DateField";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconTrash } from "@tabler/icons-react";
import { AmountInput } from "@/components/shared/AmountInput";
import { RefundSection } from "@/components/refunds/RefundSection";
import { useExpenseStore } from "@/stores/expenseStore";
import { useEnvelopeStore } from "@/stores/envelopeStore";
import { useUiStore } from "@/stores/uiStore";
import { formatCurrency } from "@/lib/client-utils";
import { sumRefundAmounts, toCents } from "@/lib/refunds";
import type {
  ExpenseWithRelations,
  RefundWithRelations,
  UpdateExpenseInput,
} from "@/types";

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

/** GET /api/expenses/[id] nests the budget inside the envelope. */
type ExpenseDetail = ExpenseWithRelations & {
  envelope: ExpenseWithRelations["envelope"] & { budget: { currency: string } };
};

export default function EditExpensePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [payeeOptions, setPayeeOptions] = useState<string[]>([]);
  const { updateExpense, fetchExpenses, deleteExpense } = useExpenseStore();
  const { envelopes, fetchEnvelopes } = useEnvelopeStore();
  const { currentBudgetId } = useUiStore();

  const currency = expense?.envelope?.budget?.currency;
  const refunds = expense?.refunds ?? [];
  const refundedTotal = sumRefundAmounts(refunds);

  // Mantine captures validation rules on first render, before the expense has
  // loaded, so the amount rule reads the refunded total through a ref.
  const refundedTotalRef = useRef(0);
  refundedTotalRef.current = refundedTotal;
  const currencyRef = useRef<string | undefined>(undefined);
  currencyRef.current = currency;

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
      amount: (value) => {
        if (value <= 0) return "Amount must be greater than 0";
        const refunded = refundedTotalRef.current;
        if (refunded > 0 && toCents(value) < toCents(refunded)) {
          return `Cannot be less than the ${formatCurrency(
            refunded,
            currencyRef.current
          )} already refunded`;
        }
        return null;
      },
      payee: (value) => (value.length < 1 ? "Payee is required" : null),
      envelopeId: (value) =>
        !value || value.length < 1 ? "Envelope is required" : null,
    },
  });

  const handleRefundsChange = (next: RefundWithRelations[]) => {
    setExpense((prev) => (prev ? { ...prev, refunds: next } : prev));
  };

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
        const expenseData: ExpenseDetail = data.data;
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

  useEffect(() => {
    if (loading || window.location.hash !== "#refunds") return;

    const scrollToRefunds = () => {
      document.getElementById("refunds")?.scrollIntoView({ behavior: "smooth" });
    };

    // Wait for layout after the expense and refund section have rendered.
    const frame = window.requestAnimationFrame(scrollToRefunds);
    return () => window.cancelAnimationFrame(frame);
  }, [loading]);

  const handleDeleteExpense = async () => {
    if (!expense) return;

    setDeleteLoading(true);

    try {
      const success = await deleteExpense(params.id);

      if (success) {
        if (currentBudgetId) {
          await fetchExpenses(undefined, currentBudgetId);
        }
        notifications.show({
          title: "Expense deleted",
          message: `Expense at "${expense.payee?.name ?? "Unknown payee"}" has been removed`,
          color: "green",
        });
        setDeleteModalOpen(false);
        router.push("/dashboard/expenses");
      } else {
        notifications.show({
          title: "Error",
          message: useExpenseStore.getState().error ?? "Failed to delete expense",
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
      setDeleteLoading(false);
    }
  };

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
          // The store records the server's message, which explains specific
          // rejections such as an amount below what has already been refunded.
          message: useExpenseStore.getState().error ?? "Failed to update expense",
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
              min={refundedTotal > 0 ? refundedTotal : 0}
              // Without this, Mantine clamps up to `min` on blur, so lowering
              // the amount below the refunded total would silently snap back
              // and appear to save successfully.
              clampBehavior="none"
              decimalScale={2}
              fixedDecimalScale
              prefix="$"
              thousandSeparator=","
              description={
                refundedTotal > 0
                  ? `At least ${formatCurrency(refundedTotal, currency)} — the amount already refunded`
                  : undefined
              }
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

      <RefundSection
        expenseId={expense.id}
        grossAmount={Number(expense.amount)}
        expenseDate={expense.date}
        currency={currency}
        refunds={refunds}
        onRefundsChange={handleRefundsChange}
        canManage
      />

      <Card withBorder maw={600} style={{ borderColor: "var(--mantine-color-red-4)" }}>
        <Stack>
          <Title order={4} c="red">
            Danger Zone
          </Title>
          <Text size="sm" c="dimmed">
            Permanently delete this expense and any associated refunds from your account.
          </Text>
          <Group>
            <Button
              color="red"
              variant="outline"
              leftSection={<IconTrash size={18} />}
              onClick={() => setDeleteModalOpen(true)}
            >
              Delete Expense
            </Button>
          </Group>
        </Stack>
      </Card>

      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Expense"
      >
        <Stack>
          <Alert color="red" variant="light">
            Are you sure you want to delete the expense at{" "}
            <strong>{expense.payee?.name ?? "this payee"}</strong>? This action cannot be undone.
          </Alert>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" loading={deleteLoading} onClick={handleDeleteExpense}>
              Delete Expense
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
