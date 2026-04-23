"use client";

import { useEffect, useState } from "react";
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
  Divider,
  Table,
  Badge,
  ActionIcon,
  Modal,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconTrash, IconUserPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useBudgetStore } from "@/stores/budgetStore";
import { useUiStore } from "@/stores/uiStore";
import type { UpdateBudgetInput } from "@/types";

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

export default function BudgetSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const { budgets, updateBudget, fetchBudgets } = useBudgetStore();
  const { currentBudgetId } = useUiStore();

  const currentBudget = budgets.find((b) => b.id === currentBudgetId);

  const inviteForm = useForm({
    initialValues: {
      email: "",
      role: "USER",
    },
    validate: {
      email: (value) => {
        if (!value) return "Email is required";
        if (!/^\S+@\S+$/.test(value)) return "Invalid email";
        return null;
      },
    },
  });

  const form = useForm<UpdateBudgetInput>({
    initialValues: {
      name: currentBudget?.name || "",
      amount: currentBudget?.amount ? Number(currentBudget.amount) : 0,
      description: currentBudget?.description || "",
      currency: currentBudget?.currency || "USD",
      periodType: currentBudget?.periodType || "MONTHLY",
      periodDay: currentBudget?.periodDay || 1,
      customDays: currentBudget?.customDays || 30,
      startDate: currentBudget?.startDate ? new Date(currentBudget.startDate) : new Date(),
    },
  });

  useEffect(() => {
    if (currentBudget) {
      form.setValues({
        name: currentBudget.name,
        amount: Number(currentBudget.amount),
        description: currentBudget.description || "",
        currency: currentBudget.currency,
        periodType: currentBudget.periodType,
        periodDay: currentBudget.periodDay || 1,
        customDays: currentBudget.customDays || 30,
        startDate: currentBudget.startDate ? new Date(currentBudget.startDate) : new Date(),
      });
    }
  }, [currentBudget]);

  const handleSubmit = async (values: UpdateBudgetInput) => {
    if (!currentBudgetId) return;

    setLoading(true);

    try {
      const success = await updateBudget(currentBudgetId, values);

      if (success) {
        notifications.show({
          title: "Budget updated",
          message: "Your budget has been updated successfully",
          color: "green",
        });
        await fetchBudgets();
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to update budget",
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

  const handleInvite = async (values: { email: string; role: string }) => {
    if (!currentBudgetId) return;

    setInviteLoading(true);

    try {
      const response = await fetch(`/api/budgets/${currentBudgetId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: "Member invited",
          message: `${values.email} has been added to this budget`,
          color: "green",
        });
        setInviteModalOpen(false);
        inviteForm.reset();
        await fetchBudgets();
      } else {
        notifications.show({
          title: "Error",
          message: data.error || "Failed to invite member",
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
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentBudgetId) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await fetch(
        `/api/budgets/${currentBudgetId}/members?userId=${userId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: "Member removed",
          message: "Member has been removed from this budget",
          color: "green",
        });
        await fetchBudgets();
      } else {
        notifications.show({
          title: "Error",
          message: data.error || "Failed to remove member",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "An unexpected error occurred",
        color: "red",
      });
    }
  };

  if (!currentBudget) {
    return (
      <Stack>
        <Title order={2}>Budget Settings</Title>
        <Text c="red">Please select a budget first</Text>
        <Button component={Link} href="/dashboard" leftSection={<IconArrowLeft size={18} />}>
          Back to Dashboard
        </Button>
      </Stack>
    );
  }

  const periodType = form.values.periodType;

  return (
    <Stack>
      <Group justify="space-between">
        <Button
          component={Link}
          href="/dashboard"
          variant="subtle"
          leftSection={<IconArrowLeft size={18} />}
        >
          Back to Dashboard
        </Button>
      </Group>

      <Title order={2}>Budget Settings</Title>
      <Text c="dimmed">Manage settings for {currentBudget.name}</Text>

      <Card withBorder>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Title order={4}>Basic Information</Title>

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

            <Divider />

            <Title order={4}>Budget Period</Title>

            <Select
              label="Period Type"
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
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Card withBorder>
        <Stack>
          <Group justify="space-between">
            <div>
              <Title order={4}>Members</Title>
              <Text size="sm" c="dimmed">
                Manage who has access to this budget
              </Text>
            </div>
            <Button
              leftSection={<IconUserPlus size={18} />}
              variant="light"
              onClick={() => setInviteModalOpen(true)}
            >
              Invite Member
            </Button>
          </Group>

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {currentBudget.members?.map((member) => (
                <Table.Tr key={member.id}>
                  <Table.Td>{member.user.name || "Unknown"}</Table.Td>
                  <Table.Td>{member.user.email}</Table.Td>
                  <Table.Td>
                    <Badge 
                      variant="light" 
                      color={
                        member.role === "OWNER" ? "grape" : 
                        member.role === "ADMIN" ? "blue" : 
                        "gray"
                      }
                    >
                      {member.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {member.role !== "OWNER" && (
                      <ActionIcon 
                        variant="subtle" 
                        color="red"
                        onClick={() => handleRemoveMember(member.userId)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>

      <Modal
        opened={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          inviteForm.reset();
        }}
        title="Invite Member to Budget"
      >
        <form onSubmit={inviteForm.onSubmit(handleInvite)}>
          <Stack>
            <TextInput
              label="Email Address"
              placeholder="user@example.com"
              required
              {...inviteForm.getInputProps("email")}
            />

            <Select
              label="Role"
              description="Admins can manage settings and invite others. Users can only add expenses."
              data={[
                { value: "ADMIN", label: "Admin" },
                { value: "USER", label: "User" },
              ]}
              {...inviteForm.getInputProps("role")}
            />

            <Group justify="flex-end" mt="md">
              <Button 
                variant="subtle" 
                onClick={() => {
                  setInviteModalOpen(false);
                  inviteForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={inviteLoading}>
                Send Invite
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
