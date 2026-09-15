"use client";

import { useEffect, useState } from "react";
import {
  Title,
  Text,
  Card,
  Stack,
  Group,
  Button,
  Progress,
  Badge,
  Table,
  Skeleton,
  Modal,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import Link from "next/link";
import { IconArrowLeft, IconEdit, IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useGoalStore } from "@/stores/goalStore";
import { useBudgetStore } from "@/stores/budgetStore";
import { EnvelopeIcon } from "@/components/envelopes/EnvelopeIcon";
import { formatCurrency } from "@/lib/client-utils";
import { useGoalProgress } from "@/hooks/useGoalProgress";
import {
  goalProgressBadgeColor,
  goalProgressBarColor,
} from "@/lib/goal-progress-color";
import { AmountInput } from "@/components/shared/AmountInput";
import type { GoalWithRelations } from "@/types";
import { canManageBudget, getMembershipRole } from "@/lib/permissions";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";

export default function GoalDetailPage() {
  const params = useParams();
  const goalId = params.id as string;
  const { data: session } = useSession();
  const { fetchGoal, createCharge } = useGoalStore();
  const { budgets } = useBudgetStore();
  const [goal, setGoal] = useState<GoalWithRelations | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeLoading, setChargeLoading] = useState(false);

  const budget = budgets.find((b) => b.id === goal?.budgetId);
  const userRole = getMembershipRole(budget?.members, session?.user?.id);
  const canManage = canManageBudget(userRole);

  const {
    progressPercent,
    primaryAmount,
    secondaryAmount,
    primaryLabel,
    secondaryLabel,
  } = useGoalProgress(goal, goal?.expenses ?? [], goal?.charges ?? []);

  const chargeForm = useForm({
    initialValues: { amount: 0, description: "" },
    validate: {
      amount: (v) => (v <= 0 ? "Amount required" : null),
    },
  });

  const load = () => fetchGoal(goalId).then(setGoal);

  useEffect(() => {
    load();
  }, [goalId]);

  if (!goal) {
    return <Skeleton height={400} />;
  }

  const isSave = goal.type === "SAVE";
  const currency = budget?.currency ?? "USD";

  const handleCharge = async (values: typeof chargeForm.values) => {
    setChargeLoading(true);
    try {
      const ok = await createCharge(goal.id, values);
      if (ok) {
        notifications.show({ title: "Charge added", message: "Debt balance updated", color: "green" });
        setChargeOpen(false);
        chargeForm.reset();
        load();
      }
    } finally {
      setChargeLoading(false);
    }
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Button
          component={Link}
          href="/dashboard"
          variant="subtle"
          leftSection={<IconArrowLeft size={18} />}
        >
          Back
        </Button>
        {canManage && (
          <Button
            component={Link}
            href={`/dashboard/goals/${goal.id}/edit`}
            variant="light"
            leftSection={<IconEdit size={18} />}
          >
            Edit
          </Button>
        )}
      </Group>

      <Card withBorder>
        <Stack>
          <Group justify="space-between">
            <Group>
              <EnvelopeIcon icon={goal.icon} color={goal.color} size={28} />
              <div>
                <Title order={2}>{goal.name}</Title>
                <Badge variant="light">{isSave ? "Saving" : "Debt payoff"}</Badge>
              </div>
            </Group>
            <Badge
              size="xl"
              color={goalProgressBadgeColor(goal.type, progressPercent)}
              variant="light"
            >
              {Math.round(progressPercent)}%
            </Badge>
          </Group>
          {goal.description && <Text c="dimmed">{goal.description}</Text>}
          <Progress
            value={Math.min(progressPercent, 100)}
            size="xl"
            color={goalProgressBarColor(goal.type, progressPercent)}
          />
          <Group grow>
            <div>
              <Text size="sm" c="dimmed" tt="capitalize">
                {primaryLabel}
              </Text>
              <Text size="xl" fw={700}>
                {formatCurrency(primaryAmount, currency)}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" tt="capitalize">
                {secondaryLabel}
              </Text>
              <Text size="xl" fw={700}>
                {formatCurrency(secondaryAmount, currency)}
              </Text>
            </div>
          </Group>
          <Group>
            <Button
              component={Link}
              href={`/dashboard/expenses/new?goalId=${goal.id}&mode=contribution`}
              leftSection={<IconPlus size={18} />}
            >
              Add contribution
            </Button>
            {!isSave && (
              <Button variant="light" onClick={() => setChargeOpen(true)}>
                Add charge
              </Button>
            )}
          </Group>
        </Stack>
      </Card>

      <Title order={4}>Activity</Title>
      <Card withBorder>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Source</Table.Th>
              <Table.Th>Amount</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {goal.expenses.map((exp) => (
              <Table.Tr key={exp.id}>
                <Table.Td>{new Date(exp.date).toLocaleDateString()}</Table.Td>
                <Table.Td>Contribution</Table.Td>
                <Table.Td>{exp.envelope.name}</Table.Td>
                <Table.Td>{formatCurrency(Number(exp.amount), currency)}</Table.Td>
              </Table.Tr>
            ))}
            {goal.charges.map((c) => (
              <Table.Tr key={c.id}>
                <Table.Td>{new Date(c.date).toLocaleDateString()}</Table.Td>
                <Table.Td>Charge</Table.Td>
                <Table.Td>—</Table.Td>
                <Table.Td>{formatCurrency(Number(c.amount), currency)}</Table.Td>
              </Table.Tr>
            ))}
            {goal.expenses.length === 0 && goal.charges.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center">
                    No activity yet
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal opened={chargeOpen} onClose={() => setChargeOpen(false)} title="Add charge">
        <form onSubmit={chargeForm.onSubmit(handleCharge)}>
          <Stack>
            <AmountInput label="Amount" prefix="$" min={0} decimalScale={2} {...chargeForm.getInputProps("amount")} />
            <Textarea label="Description" {...chargeForm.getInputProps("description")} />
            <Button type="submit" loading={chargeLoading}>
              Add charge
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
