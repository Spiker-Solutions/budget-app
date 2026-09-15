"use client";

import { useEffect, useState } from "react";
import {
  Title,
  Text,
  Card,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  SegmentedControl,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGoalStore } from "@/stores/goalStore";
import { useBudgetStore } from "@/stores/budgetStore";
import { useUiStore } from "@/stores/uiStore";
import { canManageBudget, getMembershipRole } from "@/lib/permissions";
import { IconPicker } from "@/components/envelopes/IconPicker";
import { ColorPicker } from "@/components/envelopes/ColorPicker";
import { AmountInput } from "@/components/shared/AmountInput";
import { DEFAULT_ENVELOPE_COLOR } from "@/lib/envelope-colors";
import type { GoalType } from "@/types";

type GoalFormValues = {
  name: string;
  type: GoalType;
  description: string;
  icon: string | null;
  color: string | null;
  startingAmount: number;
  targetAmount: number;
};

export default function NewGoalPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const { createGoal, fetchGoals } = useGoalStore();
  const { budgets } = useBudgetStore();
  const { currentBudgetId } = useUiStore();

  const currentBudget = budgets.find((b) => b.id === currentBudgetId);
  const userRole = getMembershipRole(currentBudget?.members, session?.user?.id);
  const canManage = canManageBudget(userRole);

  useEffect(() => {
    if (!currentBudgetId || !session?.user?.id || !currentBudget) return;
    if (!canManage) {
      notifications.show({
        title: "Access denied",
        message: "Only budget owners and admins can create goals",
        color: "red",
      });
      router.replace("/dashboard");
    }
  }, [currentBudgetId, session?.user?.id, currentBudget, canManage, router]);

  const form = useForm<GoalFormValues>({
    initialValues: {
      name: "",
      type: "SAVE",
      description: "",
      icon: null,
      color: DEFAULT_ENVELOPE_COLOR,
      startingAmount: 0,
      targetAmount: 0,
    },
    validate: {
      name: (v) => (v.length < 1 ? "Name is required" : null),
      targetAmount: (v, values) => {
        if (v < 0) return "Target cannot be negative";
        if (values.type === "SAVE" && v <= values.startingAmount) {
          return "Target must be greater than starting amount";
        }
        if (values.type === "DEBT" && v > values.startingAmount) {
          return "Payoff target cannot exceed starting balance";
        }
        if (values.type === "DEBT" && values.startingAmount <= 0) {
          return null;
        }
        if (values.type === "SAVE" && v <= 0) return "Enter a target amount";
        if (values.type === "DEBT" && values.startingAmount <= 0) {
          return "Enter starting balance owed";
        }
        return null;
      },
      startingAmount: (v, values) => {
        if (v < 0) return "Cannot be negative";
        if (values.type === "DEBT" && v <= 0) return "Starting balance is required for debt";
        return null;
      },
    },
  });

  const isSave = form.values.type === "SAVE";

  const handleSubmit = async (values: GoalFormValues) => {
    if (!currentBudgetId) return;
    setLoading(true);
    try {
      const goal = await createGoal({
        ...values,
        budgetId: currentBudgetId,
      });
      if (goal) {
        await fetchGoals(currentBudgetId);
        notifications.show({ title: "Goal created", message: values.name, color: "green" });
        router.push(`/dashboard/goals/${goal.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack maw={600}>
      <Title order={2}>Create goal</Title>
      <Text c="dimmed">Save toward a target or track paying down debt.</Text>

      <Card withBorder>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <SegmentedControl
              value={form.values.type}
              onChange={(v) => form.setFieldValue("type", v as GoalType)}
              data={[
                { label: "Saving", value: "SAVE" },
                { label: "Debt payoff", value: "DEBT" },
              ]}
            />

            <TextInput label="Name" required {...form.getInputProps("name")} />
            <Textarea label="Description" {...form.getInputProps("description")} />
            <ColorPicker
              value={form.values.color ?? DEFAULT_ENVELOPE_COLOR}
              onChange={(color) => form.setFieldValue("color", color)}
            />
            <IconPicker
              value={form.values.icon ?? null}
              color={form.values.color}
              onChange={(icon) => form.setFieldValue("icon", icon)}
            />

            <AmountInput
              label={isSave ? "Starting saved (optional)" : "Starting balance owed"}
              prefix="$"
              min={0}
              decimalScale={2}
              {...form.getInputProps("startingAmount")}
            />
            <AmountInput
              label={isSave ? "Target amount" : "Payoff target"}
              description={
                isSave ? "Amount you want to reach" : "Balance you want to reach (often $0)"
              }
              prefix="$"
              min={0}
              decimalScale={2}
              {...form.getInputProps("targetAmount")}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => router.back()} type="button">
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create goal
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
