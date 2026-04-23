"use client";

import { useState, useMemo } from "react";
import {
  Title,
  Text,
  Card,
  Stack,
  TextInput,
  NumberInput,
  Textarea,
  Select,
  Button,
  Group,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useBudgetStore } from "@/stores/budgetStore";
import { useUiStore } from "@/stores/uiStore";
import type { CreateBudgetInput } from "@/types";

const periodTypeOptions = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
];

const dayOfWeekOptions = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const dayOfMonthOptions = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
}));

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function NewBudgetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { createBudget, fetchBudgets } = useBudgetStore();
  const { setCurrentBudgetId } = useUiStore();

  const form = useForm<CreateBudgetInput>({
    initialValues: {
      name: "",
      amount: 0,
      description: "",
      currency: "USD",
      periodType: "MONTHLY",
      periodDay: 1,
      customDays: 30,
      startDate: new Date(),
    },
    validate: {
      name: (value) => (value.length < 1 ? "Name is required" : null),
      amount: (value) => (value <= 0 ? "Amount must be greater than 0" : null),
    },
  });

  const handleSubmit = async (values: CreateBudgetInput) => {
    setLoading(true);

    try {
      const budget = await createBudget(values);

      if (budget) {
        notifications.show({
          title: "Budget created",
          message: `"${budget.name}" has been created successfully`,
          color: "green",
        });
        setCurrentBudgetId(budget.id);
        await fetchBudgets();
        router.push("/dashboard");
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to create budget",
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

  const periodType = form.values.periodType;

  return (
    <Stack>
      <Title order={2}>Create New Budget</Title>
      <Text c="dimmed">
        Set up a new budget to start tracking your expenses.
      </Text>

      <Card withBorder maw={600}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Budget Name"
              placeholder="e.g., Monthly Household Budget"
              required
              {...form.getInputProps("name")}
            />

            <NumberInput
              label="Budget Amount"
              placeholder="0.00"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              prefix="$"
              thousandSeparator=","
              {...form.getInputProps("amount")}
            />

            <Textarea
              label="Description"
              placeholder="Optional description for this budget"
              {...form.getInputProps("description")}
            />

            <Select
              label="Budget Period"
              data={periodTypeOptions}
              {...form.getInputProps("periodType")}
            />

            {(periodType === "WEEKLY" || periodType === "BIWEEKLY") && (
              <Select
                label="Start Day"
                description="Which day should the budget period start?"
                data={dayOfWeekOptions}
                value={String(form.values.periodDay)}
                onChange={(value) =>
                  form.setFieldValue("periodDay", Number(value))
                }
              />
            )}

            {periodType === "MONTHLY" && (
              <Select
                label="Start Day of Month"
                description="Which day should the budget period start?"
                data={dayOfMonthOptions}
                value={String(form.values.periodDay)}
                onChange={(value) =>
                  form.setFieldValue("periodDay", Number(value))
                }
              />
            )}

            {periodType === "CUSTOM" && (
              <>
                <NumberInput
                  label="Custom Period Length"
                  description="Number of days in each budget period"
                  min={1}
                  max={365}
                  {...form.getInputProps("customDays")}
                />
                <DatePickerInput
                  label="Period Start Date"
                  description="When does this budget period start?"
                  placeholder="Pick a date"
                  {...form.getInputProps("startDate")}
                />
              </>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Budget
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
