"use client";

import { useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Menu,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDots, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useExpenseStore } from "@/stores/expenseStore";
import { formatCurrency } from "@/lib/client-utils";
import { getRefundSummary, roundMoney } from "@/lib/refunds";
import { ExpenseCreatorBadge } from "@/components/expenses/ExpenseCreatorBadge";
import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import { RefundFormModal } from "@/components/refunds/RefundFormModal";
import type { RefundWithRelations } from "@/types";

interface RefundSectionProps {
  expenseId: string;
  /** The expense amount before refunds. */
  grossAmount: number;
  /** Refunds inherit this date. */
  expenseDate: Date | string;
  currency?: string;
  refunds: RefundWithRelations[];
  onRefundsChange: (refunds: RefundWithRelations[]) => void;
  canManage: boolean;
}

export function RefundSection({
  expenseId,
  grossAmount,
  expenseDate,
  currency,
  refunds,
  onRefundsChange,
  canManage,
}: RefundSectionProps) {
  const { createRefund, updateRefund, deleteRefund } = useExpenseStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RefundWithRelations | null>(null);

  const summary = useMemo(
    () => getRefundSummary({ amount: grossAmount, refunds }),
    [grossAmount, refunds]
  );

  /**
   * An edited refund competes only with its siblings, so its own current
   * amount is added back to the headroom it is allowed to claim.
   */
  const maxRefundable = useMemo(() => {
    if (!editing) return summary.refundableRemaining;
    return roundMoney(summary.refundableRemaining + Number(editing.amount));
  }, [editing, summary.refundableRemaining]);

  const fullyRefunded = summary.status === "FULL";

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (refund: RefundWithRelations) => {
    setEditing(refund);
    setModalOpen(true);
  };

  const handleSubmit = async (values: { amount: number; description?: string }) => {
    if (editing) {
      const result = await updateRefund(expenseId, editing.id, values);
      if (!result.ok) return result;

      onRefundsChange(refunds.map((r) => (r.id === editing.id ? result.refund : r)));
      notifications.show({
        title: "Refund updated",
        message: `Refund of ${formatCurrency(Number(result.refund.amount), currency)} saved`,
        color: "green",
      });
      return { ok: true };
    }

    const result = await createRefund(expenseId, values);
    if (!result.ok) return result;

    onRefundsChange([...refunds, result.refund]);
    notifications.show({
      title: "Refund added",
      message: `Refund of ${formatCurrency(Number(result.refund.amount), currency)} recorded`,
      color: "green",
    });
    return { ok: true };
  };

  const handleDelete = async (refund: RefundWithRelations) => {
    const label = formatCurrency(Number(refund.amount), currency);
    if (!confirm(`Remove the ${label} refund from this expense?`)) return;

    const deleted = await deleteRefund(expenseId, refund.id);

    if (deleted) {
      onRefundsChange(refunds.filter((r) => r.id !== refund.id));
      notifications.show({
        title: "Refund removed",
        message: `The ${label} refund has been removed`,
        color: "green",
      });
    } else {
      notifications.show({
        title: "Error",
        message: "Failed to remove refund",
        color: "red",
      });
    }
  };

  return (
    <Card withBorder maw={600} id="refunds">
      <Stack>
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <Title order={4}>Refunds</Title>
              <RefundStatusBadge status={summary.status} />
            </Group>
            <Text size="sm" c="dimmed">
              Record money returned for this expense. Refunds can never add up to more
              than the expense itself.
            </Text>
          </div>
          {canManage && (
            <Tooltip
              label="This expense is already fully refunded"
              disabled={!fullyRefunded}
            >
              <Button
                leftSection={<IconPlus size={18} />}
                variant="light"
                size="sm"
                disabled={fullyRefunded}
                onClick={openAdd}
              >
                Add Refund
              </Button>
            </Tooltip>
          )}
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
          <div>
            <Text size="xs" c="dimmed">
              Expense
            </Text>
            <Text fw={600}>{formatCurrency(summary.grossAmount, currency)}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              Refunded
            </Text>
            <Text fw={600} c={summary.refundedTotal > 0 ? "teal" : undefined}>
              {formatCurrency(summary.refundedTotal, currency)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              Net cost
            </Text>
            <Text fw={600}>{formatCurrency(summary.netAmount, currency)}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              Still refundable
            </Text>
            <Text fw={600}>{formatCurrency(summary.refundableRemaining, currency)}</Text>
          </div>
        </SimpleGrid>

        {refunds.length === 0 ? (
          <Alert variant="light" color="gray">
            No refunds recorded for this expense.
          </Alert>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ textAlign: "right", width: "110px" }}>Amount</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Added by</Table.Th>
                {canManage && <Table.Th style={{ width: "50px" }}></Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {refunds.map((refund) => (
                <Table.Tr key={refund.id}>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text fw={500}>
                      {formatCurrency(Number(refund.amount), currency)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{refund.description || "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    {refund.createdBy ? (
                      <ExpenseCreatorBadge user={refund.createdBy} />
                    ) : (
                      <Text c="dimmed" size="sm">
                        -
                      </Text>
                    )}
                  </Table.Td>
                  {canManage && (
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
                            onClick={() => openEdit(refund)}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={() => handleDelete(refund)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      {canManage && (
        <RefundFormModal
          opened={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          expenseDate={expenseDate}
          currency={currency}
          maxRefundable={maxRefundable}
          refund={editing}
          onSubmit={handleSubmit}
        />
      )}
    </Card>
  );
}
