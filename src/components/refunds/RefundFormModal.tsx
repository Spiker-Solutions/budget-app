"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconAlertCircle } from "@tabler/icons-react";
import dayjs from "dayjs";
import { AmountInput } from "@/components/shared/AmountInput";
import { formatCurrency } from "@/lib/client-utils";
import { toCents } from "@/lib/refunds";
import type { RefundWithRelations } from "@/types";

type RefundMode = "FULL" | "PARTIAL";

type RefundFormValues = {
  amount: number;
  description: string;
};

export type RefundSubmitResult = { ok: boolean; error?: string };

interface RefundFormModalProps {
  opened: boolean;
  onClose: () => void;
  /** The expense date this refund inherits. Shown read-only; never editable. */
  expenseDate: Date | string;
  currency?: string;
  /**
   * The largest amount this refund may take. When editing, the refund's own
   * current amount is already included, so it can grow into its own room.
   */
  maxRefundable: number;
  refund?: RefundWithRelations | null;
  onSubmit: (values: { amount: number; description?: string }) => Promise<RefundSubmitResult>;
}

export function RefundFormModal({
  opened,
  onClose,
  expenseDate,
  currency,
  maxRefundable,
  refund,
  onSubmit,
}: RefundFormModalProps) {
  const isEditing = Boolean(refund);
  const [mode, setMode] = useState<RefundMode>("FULL");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RefundFormValues>({
    initialValues: { amount: maxRefundable, description: "" },
    validate: {
      amount: (value) => {
        if (!value || value <= 0) return "Refund must be greater than 0";
        if (toCents(value) > toCents(maxRefundable)) {
          return `Cannot exceed ${formatCurrency(maxRefundable, currency)} remaining on this expense`;
        }
        return null;
      },
    },
  });

  // Reopening the modal for a different refund (or for a new one) has to reset
  // both the fields and the full/partial toggle.
  useEffect(() => {
    if (!opened) return;

    const amount = refund ? Number(refund.amount) : maxRefundable;
    setMode(toCents(amount) === toCents(maxRefundable) ? "FULL" : "PARTIAL");
    setServerError(null);
    form.setValues({ amount, description: refund?.description ?? "" });
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, refund, maxRefundable]);

  const handleModeChange = (value: string) => {
    const next = value as RefundMode;
    setMode(next);
    if (next === "FULL") {
      form.setFieldValue("amount", maxRefundable);
    }
  };

  const handleSubmit = async (values: RefundFormValues) => {
    setSubmitting(true);
    setServerError(null);

    try {
      const result = await onSubmit({
        amount: values.amount,
        description: values.description.trim() || undefined,
      });

      if (result.ok) {
        onClose();
      } else {
        setServerError(result.error ?? "Failed to save refund");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? "Edit Refund" : "Add Refund"}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {serverError && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {serverError}
            </Alert>
          )}

          <SegmentedControl
            value={mode}
            onChange={handleModeChange}
            data={[
              { value: "FULL", label: "Full refund" },
              { value: "PARTIAL", label: "Partial refund" },
            ]}
            fullWidth
          />

          <AmountInput
            label="Refund amount"
            placeholder="0.00"
            required
            min={0}
            max={maxRefundable}
            decimalScale={2}
            fixedDecimalScale
            prefix="$"
            thousandSeparator=","
            disabled={mode === "FULL"}
            description={
              mode === "FULL"
                ? `Full refund of the ${formatCurrency(maxRefundable, currency)} outstanding`
                : `Up to ${formatCurrency(maxRefundable, currency)} can be refunded`
            }
            {...form.getInputProps("amount")}
          />

          <Textarea
            label="Description"
            placeholder="Which items were refunded, and why?"
            autosize
            minRows={2}
            maxRows={5}
            {...form.getInputProps("description")}
          />

          <Text size="xs" c="dimmed">
            Dated {dayjs(expenseDate).format("MMM D, YYYY")}, matching the expense so the
            refund lands in the same budget period.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEditing ? "Save Refund" : "Add Refund"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
