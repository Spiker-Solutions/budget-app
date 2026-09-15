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
} from "@mantine/core";
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
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Envelope</Table.Th>
                <Table.Th>Remaining</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Save goal</Table.Th>
                <Table.Th>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.envelopeRows.map((er, idx) => (
                <Table.Tr key={er.envelopeId}>
                  <Table.Td>{er.envelopeName}</Table.Td>
                  <Table.Td>{formatCurrency(er.remainingThisPeriod, currency)}</Table.Td>
                  <Table.Td>
                    <Select
                      data-testid={`wizard-action-${idx}`}
                      data={[
                        { value: "keep", label: "Keep in envelope" },
                        { value: "goal", label: "Send to save goal" },
                      ]}
                      value={rows[idx]?.keepInEnvelope ? "keep" : "goal"}
                      onChange={(v) => {
                        setRows((prev) => {
                          const next = [...prev];
                          next[idx] = {
                            ...next[idx],
                            keepInEnvelope: v === "keep",
                          };
                          return next;
                        });
                      }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Select
                      data-testid={`wizard-goal-${idx}`}
                      placeholder="Goal"
                      data={goalOptions}
                      disabled={rows[idx]?.keepInEnvelope}
                      value={rows[idx]?.goalId}
                      onChange={(v) => {
                        setRows((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], goalId: v };
                          return next;
                        });
                      }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      disabled={rows[idx]?.keepInEnvelope}
                      min={0}
                      max={er.remainingThisPeriod}
                      decimalScale={2}
                      value={rows[idx]?.amount}
                      onChange={(v) => {
                        setRows((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], amount: Number(v) || 0 };
                          return next;
                        });
                      }}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              Confirm allocations
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
