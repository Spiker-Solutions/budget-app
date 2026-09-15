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
  Badge,
  Skeleton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGoalStore } from "@/stores/goalStore";
import { useBudgetStore } from "@/stores/budgetStore";
import { canManageBudget, getMembershipRole } from "@/lib/permissions";
import { IconPicker } from "@/components/envelopes/IconPicker";
import { ColorPicker } from "@/components/envelopes/ColorPicker";
import { AmountInput } from "@/components/shared/AmountInput";
import type { GoalWithRelations } from "@/types";
import { useParams } from "next/navigation";

export default function EditGoalPage() {
  const params = useParams();
  const goalId = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState<GoalWithRelations | null>(null);
  const { updateGoal, fetchGoal, archiveGoal } = useGoalStore();
  const { budgets } = useBudgetStore();

  const budget = budgets.find((b) => b.id === goal?.budgetId);
  const userRole = getMembershipRole(budget?.members, session?.user?.id);
  const canManage = canManageBudget(userRole);

  useEffect(() => {
    fetchGoal(goalId).then(setGoal);
  }, [goalId, fetchGoal]);

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      icon: null as string | null,
      color: null as string | null,
      startingAmount: 0,
      targetAmount: 0,
    },
  });

  useEffect(() => {
    if (!goal) return;
    form.setValues({
      name: goal.name,
      description: goal.description ?? "",
      icon: goal.icon,
      color: goal.color,
      startingAmount: Number(goal.startingAmount),
      targetAmount: Number(goal.targetAmount),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal]);

  if (!goal) {
    return <Skeleton height={300} />;
  }

  if (!canManage) {
    return <Text c="red">You cannot edit this goal.</Text>;
  }

  const isSave = goal.type === "SAVE";

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const updated = await updateGoal(goal.id, values);
      if (updated) {
        notifications.show({ title: "Saved", message: "Goal updated", color: "green" });
        router.push(`/dashboard/goals/${goal.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Archive this goal?")) return;
    const ok = await archiveGoal(goal.id);
    if (ok) router.push("/dashboard");
  };

  return (
    <Stack maw={600}>
      <Group>
        <Title order={2}>Edit goal</Title>
        <Badge>{isSave ? "Saving" : "Debt"}</Badge>
      </Group>

      <Card withBorder>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Name" required {...form.getInputProps("name")} />
            <Textarea label="Description" {...form.getInputProps("description")} />
            <ColorPicker
              value={form.values.color ?? "blue"}
              onChange={(color) => form.setFieldValue("color", color)}
            />
            <IconPicker
              value={form.values.icon ?? null}
              color={form.values.color}
              onChange={(icon) => form.setFieldValue("icon", icon)}
            />
            <AmountInput
              label={isSave ? "Starting saved" : "Starting balance owed"}
              prefix="$"
              min={0}
              decimalScale={2}
              {...form.getInputProps("startingAmount")}
            />
            <AmountInput
              label={isSave ? "Target amount" : "Payoff target"}
              prefix="$"
              min={0}
              decimalScale={2}
              {...form.getInputProps("targetAmount")}
            />
            <Group justify="space-between">
              <Button color="red" variant="subtle" type="button" onClick={handleArchive}>
                Archive goal
              </Button>
              <Group>
                <Button variant="subtle" onClick={() => router.back()} type="button">
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Save
                </Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
