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
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  Select,
  Divider,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconEdit,
  IconPlus,
  IconDots,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEnvelopeStore } from "@/stores/envelopeStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { useBudgetStore } from "@/stores/budgetStore";
import { formatCurrency } from "@/lib/client-utils";
import dayjs from "dayjs";

export default function EnvelopeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [envelope, setEnvelope] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const { expenses, fetchExpenses, deleteExpense } = useExpenseStore();
  const { budgets } = useBudgetStore();

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

  useEffect(() => {
    const fetchEnvelope = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/envelopes/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setEnvelope(data.data);
          await fetchExpenses(params.id);
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Failed to fetch envelope:", error);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchEnvelope();
  }, [params.id, fetchExpenses, router]);

  const handleDeleteExpense = async (expenseId: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      await deleteExpense(expenseId);
      await fetchExpenses(params.id);
    }
  };

  const handleInvite = async (values: { email: string; role: string }) => {
    setInviteLoading(true);

    try {
      const response = await fetch(`/api/envelopes/${params.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: "Member invited",
          message: `${values.email} has been added to this envelope`,
          color: "green",
        });
        setInviteModalOpen(false);
        inviteForm.reset();
        
        const envelopeResponse = await fetch(`/api/envelopes/${params.id}`);
        if (envelopeResponse.ok) {
          const envelopeData = await envelopeResponse.json();
          setEnvelope(envelopeData.data);
        }
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
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await fetch(
        `/api/envelopes/${params.id}/members?userId=${userId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: "Member removed",
          message: "Member has been removed from this envelope",
          color: "green",
        });
        
        const envelopeResponse = await fetch(`/api/envelopes/${params.id}`);
        if (envelopeResponse.ok) {
          const envelopeData = await envelopeResponse.json();
          setEnvelope(envelopeData.data);
        }
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

  if (loading) {
    return (
      <Stack>
        <Skeleton height={40} width={300} />
        <Skeleton height={200} />
        <Skeleton height={300} />
      </Stack>
    );
  }

  if (!envelope) {
    return (
      <Stack>
        <Title order={2}>Envelope not found</Title>
        <Button component={Link} href="/dashboard" leftSection={<IconArrowLeft size={18} />}>
          Back to Dashboard
        </Button>
      </Stack>
    );
  }

  const budget = budgets.find((b) => b.id === envelope.budgetId);
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const allocation = Number(envelope.allocation);
  const remaining = allocation - totalSpent;
  const percentage = allocation > 0 ? (totalSpent / allocation) * 100 : 0;

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
        <Button
          component={Link}
          href={`/dashboard/envelopes/${params.id}/edit`}
          leftSection={<IconEdit size={18} />}
          variant="light"
        >
          Edit Envelope
        </Button>
      </Group>

      <Card withBorder>
        <Stack>
          <Group justify="space-between">
            <div>
              <Title order={2}>{envelope.name}</Title>
              {envelope.description && (
                <Text c="dimmed">{envelope.description}</Text>
              )}
            </div>
            <Badge
              size="xl"
              color={
                percentage > 100 ? "red" : percentage > 80 ? "yellow" : "blue"
              }
              variant="light"
            >
              {Math.round(percentage)}%
            </Badge>
          </Group>

          <Progress
            value={Math.min(percentage, 100)}
            color={percentage > 100 ? "red" : percentage > 80 ? "yellow" : "blue"}
            size="xl"
          />

          <Group grow>
            <div>
              <Text size="sm" c="dimmed">
                Allocation
              </Text>
              <Text size="xl" fw={700}>
                {formatCurrency(allocation, budget?.currency)}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                Spent
              </Text>
              <Text size="xl" fw={700} c={totalSpent > allocation ? "red" : undefined}>
                {formatCurrency(totalSpent, budget?.currency)}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                Remaining
              </Text>
              <Text size="xl" fw={700} c={remaining < 0 ? "red" : "green"}>
                {formatCurrency(remaining, budget?.currency)}
              </Text>
            </div>
          </Group>
        </Stack>
      </Card>

      <Card withBorder>
        <Stack>
          <Group justify="space-between">
            <div>
              <Title order={4}>Members</Title>
              <Text size="sm" c="dimmed">
                Manage who has access to this envelope
              </Text>
            </div>
            <Button
              leftSection={<IconUserPlus size={18} />}
              variant="light"
              size="sm"
              onClick={() => setInviteModalOpen(true)}
            >
              Invite Member
            </Button>
          </Group>

          {envelope.members && envelope.members.length > 0 ? (
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
                {envelope.members.map((member: any) => (
                  <Table.Tr key={member.id}>
                    <Table.Td>{member.user.name || "Unknown"}</Table.Td>
                    <Table.Td>{member.user.email}</Table.Td>
                    <Table.Td>
                      <Badge 
                        variant="light" 
                        size="sm"
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
                          size="sm"
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text size="sm" c="dimmed">
              No additional members
            </Text>
          )}
        </Stack>
      </Card>

      <Group justify="space-between">
        <Title order={3}>Expenses</Title>
        <Button
          component={Link}
          href="/dashboard/expenses/new"
          leftSection={<IconPlus size={18} />}
        >
          Add Expense
        </Button>
      </Group>

      {expenses.length === 0 ? (
        <Card withBorder p="xl">
          <Stack align="center">
            <Text c="dimmed">No expenses in this envelope yet</Text>
            <Button
              component={Link}
              href="/dashboard/expenses/new"
              leftSection={<IconPlus size={18} />}
              variant="light"
            >
              Add your first expense
            </Button>
          </Stack>
        </Card>
      ) : (
        <Card withBorder p={0}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Payee</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Amount</Table.Th>
                <Table.Th style={{ width: "50px" }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {expenses.map((expense) => (
                <Table.Tr key={expense.id}>
                  <Table.Td>
                    {dayjs(expense.date).format("MMM D, YYYY")}
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{expense.payee.name}</Text>
                    {expense.location && (
                      <Text size="xs" c="dimmed">
                        {expense.location}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1}>
                      {expense.description || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text fw={500}>
                      {formatCurrency(
                        Number(expense.amount),
                        budget?.currency
                      )}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          component={Link}
                          href={`/dashboard/expenses/${expense.id}/edit`}
                        >
                          Edit
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <Modal
        opened={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          inviteForm.reset();
        }}
        title="Invite Member to Envelope"
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
