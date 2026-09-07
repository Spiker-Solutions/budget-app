"use client";

import { Badge, Group, Table, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { ExpenseCreatorBadge } from "@/components/expenses/ExpenseCreatorBadge";
import { ExpenseRowMenu } from "@/components/expenses/ExpenseRowMenu";
import { EnvelopeIcon } from "@/components/envelopes/EnvelopeIcon";
import { ExpenseAmountCell } from "@/components/refunds/ExpenseAmountCell";
import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import { getRefundSummary, type AmountLike, type RefundAmountLike } from "@/lib/refunds";
import type { Envelope, Payee, User } from "@prisma/client";

export type ExpenseListRowData = {
  id: string;
  date: Date | string;
  amount: AmountLike;
  payee: Pick<Payee, "name">;
  envelope?: Pick<Envelope, "id" | "name" | "icon" | "color"> | null;
  description?: string | null;
  location?: string | null;
  createdBy?: Pick<User, "id" | "name" | "email" | "image"> | null;
  refunds?: RefundAmountLike[];
};

interface ExpenseListRowProps {
  expense: ExpenseListRowData;
  currency?: string;
  showEnvelope?: boolean;
  onDelete: (id: string) => void;
}

export function ExpenseListRow({
  expense,
  currency,
  showEnvelope = false,
  onDelete,
}: ExpenseListRowProps) {
  const router = useRouter();
  const editHref = `/dashboard/expenses/${expense.id}/edit`;

  return (
    <Table.Tr
      style={{ cursor: "pointer" }}
      onClick={() => router.push(editHref)}
    >
      <Table.Td>{dayjs(expense.date).format("MMM D, YYYY")}</Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Text fw={500}>{expense.payee.name}</Text>
          <RefundStatusBadge
            status={getRefundSummary(expense).status}
            compact
          />
        </Group>
        {expense.location && (
          <Text size="xs" c="dimmed">
            {expense.location}
          </Text>
        )}
      </Table.Td>
      {showEnvelope && (
        <Table.Td>
          {expense.envelope ? (
            <Group gap="xs" wrap="nowrap">
              <EnvelopeIcon
                icon={expense.envelope.icon}
                color={expense.envelope.color}
                size={16}
              />
              <Badge variant="light">{expense.envelope.name}</Badge>
            </Group>
          ) : (
            <Text c="dimmed" size="sm">
              Unassigned
            </Text>
          )}
        </Table.Td>
      )}
      <Table.Td>
        <Text size="sm" lineClamp={1}>
          {expense.description || "-"}
        </Text>
      </Table.Td>
      <Table.Td>
        {expense.createdBy ? (
          <ExpenseCreatorBadge user={expense.createdBy} />
        ) : (
          <Text c="dimmed" size="sm">
            -
          </Text>
        )}
      </Table.Td>
      <Table.Td style={{ textAlign: "right" }}>
        <ExpenseAmountCell expense={expense} currency={currency} />
      </Table.Td>
      <Table.Td>
        <ExpenseRowMenu
          expenseId={expense.id}
          onDelete={() => onDelete(expense.id)}
        />
      </Table.Td>
    </Table.Tr>
  );
}
