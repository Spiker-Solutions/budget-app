"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Stack,
  Text,
  Table,
  Select,
  Button,
  Group,
  NumberInput,
  Paper,
  Divider,
  Box,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { formatCurrency } from "@/lib/client-utils";
import type { Goal } from "@/types";

type EnvelopeRow = {
  envelopeId: string;
  envelopeName: string;
  remainingThisPeriod: number;
};

type WizardData = {
  period: { start: string; end: string };
  envelopeRows: EnvelopeRow[];
  saveGoals: Goal[];
};

type RowState = {
  envelopeId: string;
  keepInEnvelope: boolean;
  goalId: string | null;
  amount: number;
};

const ACTION_OPTIONS = [
  { value: "keep", label: "Keep in envelope" },
  { value: "goal", label: "Send to save goal" },
];

function RemainderWizardRowFields({
  idx,
  er,
  currency,
  goalOptions,
  row,
  onUpdateRow,
  isMobile,
}: {
  idx: number;
  er: EnvelopeRow;
  currency: string;
  goalOptions: { value: string; label: string }[];
  row: RowState | undefined;
  onUpdateRow: (idx: number, patch: Partial<RowState>) => void;
  isMobile: boolean;
}) {
  const keepInEnvelope = row?.keepInEnvelope ?? true;

  const actionSelect = (
    <Select
      data-testid={`wizard-action-${idx}`}
      label={isMobile ? "Action" : undefined}
      data={ACTION_OPTIONS}
      value={keepInEnvelope ? "keep" : "goal"}
      onChange={(v) =>
        onUpdateRow(idx, { keepInEnvelope: v === "keep" })
      }
      comboboxProps={{ withinPortal: true }}
      styles={{ root: { flex: 1, minWidth: isMobile ? undefined : 160 } }}
    />
  );

  const goalSelect = (
    <Select
      data-testid={`wizard-goal-${idx}`}
      label={isMobile ? "Save goal" : undefined}
      placeholder="Choose a goal"
      data={goalOptions}
      disabled={keepInEnvelope}
      value={row?.goalId}
      onChange={(v) => onUpdateRow(idx, { goalId: v })}
      comboboxProps={{ withinPortal: true }}
      styles={{ root: { flex: 1, minWidth: isMobile ? undefined : 180 } }}
    />
  );

  const amountInput = (
    <NumberInput
      label={isMobile ? "Amount" : undefined}
      disabled={keepInEnvelope}
      min={0}
      max={er.remainingThisPeriod}
      decimalScale={2}
      value={row?.amount}
      onChange={(v) => onUpdateRow(idx, { amount: Number(v) || 0 })}
      styles={{ root: { flex: 1, minWidth: isMobile ? undefined : 120 } }}
    />
  );

  if (isMobile) {
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Text fw={600}>{er.envelopeName}</Text>
            <Text size="sm" c="dimmed" ta="right">
              {formatCurrency(er.remainingThisPeriod, currency)} left
            </Text>
          </Group>
          {actionSelect}
          {goalSelect}
          {amountInput}
        </Stack>
      </Paper>
    );
  }

  return (
    <Table.Tr key={er.envelopeId}>
      <Table.Td>{er.envelopeName}</Table.Td>
      <Table.Td>{formatCurrency(er.remainingThisPeriod, currency)}</Table.Td>
      <Table.Td>{actionSelect}</Table.Td>
      <Table.Td>{goalSelect}</Table.Td>
      <Table.Td>{amountInput}</Table.Td>
    </Table.Tr>
  );
}

export function RemainderWizardModal({
  budgetId,
  currency,
  opened,
  onClose,
  referenceDateIso,
  onComplete,
}: {
  budgetId: string;
  currency: string;
  opened: boolean;
  onClose: () => void;
  referenceDateIso?: string;
  onComplete: () => void;
}) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<WizardData | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);

  useEffect(() => {
    if (!opened || !budgetId) return;
    setLoading(true);
    const qs = referenceDateIso ? `?referenceDate=${encodeURIComponent(referenceDateIso)}` : "";
    fetch(`/api/budgets/${budgetId}/remainder-wizard${qs}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.applicable) {
          setData({
            period: res.data.period,
            envelopeRows: res.data.envelopeRows,
            saveGoals: res.data.saveGoals,
          });
          setRows(
            res.data.envelopeRows.map((er: EnvelopeRow) => ({
              envelopeId: er.envelopeId,
              keepInEnvelope: true,
              goalId: null,
              amount: er.remainingThisPeriod,
            }))
          );
        } else {
          setData(null);
        }
      })
      .finally(() => setLoading(false));
  }, [opened, budgetId, referenceDateIso]);

  const goalOptions =
    data?.saveGoals.map((g) => ({ value: g.id, label: g.name })) ?? [];

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/budgets/${budgetId}/remainder-wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          budgetId,
          periodStart: data.period.start,
          periodEnd: data.period.end,
          allocations: rows.map((r) => ({
            envelopeId: r.envelopeId,
            goalId: r.keepInEnvelope ? undefined : r.goalId ?? undefined,
            amount: r.keepInEnvelope ? 0 : r.amount,
            keepInEnvelope: r.keepInEnvelope,
          })),
        }),
      });
      const result = await response.json();
      if (result.success) {
        notifications.show({
          title: "Allocations saved",
          message: "Contributions recorded for the closed period",
          color: "green",
        });
        onComplete();
        onClose();
      } else {
        notifications.show({ title: "Error", message: result.error, color: "red" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Allocate period remainders to savings"
      size="lg"
      fullScreen={Boolean(isMobile)}
    >
      {loading && <Text c="dimmed">Loading…</Text>}
      {!loading && !data && (
        <Text c="dimmed">No remainders to allocate for this period.</Text>
      )}
      {data && (
        <Stack>
          <Text size="sm" c="dimmed">
            Contributions count as envelope spending for that period.
          </Text>

          {isMobile ? (
            <Stack gap="md">
              {data.envelopeRows.map((er, idx) => (
                <RemainderWizardRowFields
                  key={er.envelopeId}
                  idx={idx}
                  er={er}
                  currency={currency}
                  goalOptions={goalOptions}
                  row={rows[idx]}
                  onUpdateRow={updateRow}
                  isMobile
                />
              ))}
            </Stack>
          ) : (
            <Box style={{ overflowX: "auto" }}>
              <Table miw={640}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Envelope</Table.Th>
                    <Table.Th>Remaining</Table.Th>
                    <Table.Th w={180}>Action</Table.Th>
                    <Table.Th w={200}>Save goal</Table.Th>
                    <Table.Th w={120}>Amount</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.envelopeRows.map((er, idx) => (
                    <RemainderWizardRowFields
                      key={er.envelopeId}
                      idx={idx}
                      er={er}
                      currency={currency}
                      goalOptions={goalOptions}
                      row={rows[idx]}
                      onUpdateRow={updateRow}
                      isMobile={false}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          )}

          <Divider />
          {isMobile ? (
            <Stack gap="sm">
              <Button onClick={handleSubmit} loading={submitting}>
                Confirm allocations
              </Button>
              <Button variant="subtle" onClick={onClose}>
                Cancel
              </Button>
            </Stack>
          ) : (
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} loading={submitting}>
                Confirm allocations
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  );
}
