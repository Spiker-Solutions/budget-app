"use client";

import { ActionIcon, Menu } from "@mantine/core";
import {
  IconDots,
  IconEdit,
  IconReceiptRefund,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

interface ExpenseRowMenuProps {
  expenseId: string;
  onDelete: () => void;
}

function stopRowClick(event: MouseEvent) {
  event.stopPropagation();
}

export function ExpenseRowMenu({ expenseId, onDelete }: ExpenseRowMenuProps) {
  const router = useRouter();
  const editHref = `/dashboard/expenses/${expenseId}/edit`;

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label="Expense actions"
          onClick={stopRowClick}
        >
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={stopRowClick}>
        <Menu.Item
          leftSection={<IconEdit size={14} />}
          component={Link}
          href={editHref}
        >
          Edit
        </Menu.Item>
        <Menu.Item
          leftSection={<IconReceiptRefund size={14} />}
          onClick={() => router.push(`${editHref}#refunds`)}
        >
          Refunds
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash size={14} />}
          color="red"
          onClick={onDelete}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
