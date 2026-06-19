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
  Button,
  Group,
  Skeleton,
  Select,
  SegmentedControl,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { useEnvelopeStore } from "@/stores/envelopeStore";
import { useBudgetStore } from "@/stores/budgetStore";
import { canManageEnvelope, getMembershipRole } from "@/lib/permissions";
import type { UpdateEnvelopeInput } from "@/types";

type EnvelopeEditFormValues = Omit<UpdateEnvelopeInput, "carryOverRemainder"> & {
  carryMode: "inherit" | "on" | "off";
};

function carryModeFromEnvelope(v: boolean | null | undefined): "inherit" | "on" | "off" {
  if (v === null || v === undefined) return "inherit";
  return v ? "on" : "off";
}

export default function EditEnvelopePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [envelope, setEnvelope] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { updateEnvelope, fetchEnvelopes } = useEnvelopeStore();
  const { budgets } = useBudgetStore();

  const form = useForm<EnvelopeEditFormValues>({
    initialValues: {
      name: "",
      allocation: 0,
      allocationType: "AMOUNT",
      description: "",
      carryMode: "inherit",
    },
    validate: {
      name: (value) => (value && value.length < 1 ? "Name is required" : null),
      allocation: (value, values) => {
        if (value === undefined) return null;
        if (values.allocationType === "PERCENTAGE") {
          return value <= 0 || value > 100
            ? "Percentage must be between 0 and 100"
            : null;
        }
        return value <= 0 ? "Allocation must be greater than 0" : null;
      },
    },
  });

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchEnvelope = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/envelopes/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          const envelopeData = data.data;
          const budget = budgets.find((b) => b.id === envelopeData.budgetId);
          const budgetRole = getMembershipRole(budget?.members, session?.user?.id);
          const envelopeRole = getMembershipRole(envelopeData.members, session?.user?.id);

          if (!canManageEnvelope(budgetRole, envelopeRole)) {
            notifications.show({
              title: "Access denied",
              message: "Only owners and admins can edit envelope settings",
              color: "red",
            });
            router.replace(`/dashboard/envelopes/${params.id}`);
            return;
          }

          setEnvelope(envelopeData);
          form.setValues({
            name: envelopeData.name,
            allocation: Number(envelopeData.allocation),
            allocationType: envelopeData.allocationType ?? "AMOUNT",
            description: envelopeData.description || "",
            carryMode: carryModeFromEnvelope(envelopeData.carryOverRemainder),
          });
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
  }, [params.id, router, budgets, session?.user?.id]);

  const handleSubmit = async (values: EnvelopeEditFormValues) => {
    setSaving(true);

    try {
      const { carryMode, ...rest } = values;
      const payload: UpdateEnvelopeInput = {
        ...rest,
        carryOverRemainder: carryMode === "inherit" ? null : carryMode === "on",
      };
      const success = await updateEnvelope(params.id, payload);

      if (success) {
        notifications.show({
          title: "Envelope updated",
          message: `"${payload.name}" has been updated successfully`,
          color: "green",
        });
        if (envelope?.budgetId) {
          await fetchEnvelopes(envelope.budgetId);
        }
        router.push(`/dashboard/envelopes/${params.id}`);
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to update envelope",
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
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack>
        <Skeleton height={40} width={300} />
        <Skeleton height={400} />
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

  return (
    <Stack>
      <Group justify="space-between">
        <Button
          component={Link}
          href={`/dashboard/envelopes/${params.id}`}
          variant="subtle"
          leftSection={<IconArrowLeft size={18} />}
        >
          Back to Envelope
        </Button>
      </Group>

      <Title order={2}>Edit Envelope</Title>
      <Text c="dimmed">Update the settings for this envelope</Text>

      <Card withBorder maw={600}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Envelope Name"
              placeholder="e.g., Groceries, Rent, Entertainment"
              required
              {...form.getInputProps("name")}
            />

            <SegmentedControl
              value={form.values.allocationType ?? "AMOUNT"}
              onChange={(value) =>
                form.setFieldValue("allocationType", value as "AMOUNT" | "PERCENTAGE")
              }
              data={[
                { label: "Fixed amount", value: "AMOUNT" },
                { label: "Percentage", value: "PERCENTAGE" },
              ]}
            />

            <NumberInput
              label={
                form.values.allocationType === "PERCENTAGE"
                  ? "Budget percentage"
                  : "Budget allocation"
              }
              placeholder={form.values.allocationType === "PERCENTAGE" ? "0" : "0.00"}
              description={
                form.values.allocationType === "PERCENTAGE"
                  ? "Share of the budget amount for this envelope"
                  : "How much to allocate for this envelope"
              }
              required
              min={0}
              max={form.values.allocationType === "PERCENTAGE" ? 100 : undefined}
              decimalScale={2}
              fixedDecimalScale={form.values.allocationType === "AMOUNT"}
              prefix={form.values.allocationType === "AMOUNT" ? "$" : undefined}
              suffix={form.values.allocationType === "PERCENTAGE" ? "%" : undefined}
              thousandSeparator={form.values.allocationType === "AMOUNT" ? "," : undefined}
              {...form.getInputProps("allocation")}
            />

            <Textarea
              label="Description"
              placeholder="Optional description for this envelope"
              {...form.getInputProps("description")}
            />

            <Select
              label="Carry over unspent amounts"
              description="Inherit uses the budget setting. On or off overrides for this envelope only."
              data={[
                { value: "inherit", label: "Inherit from budget" },
                { value: "on", label: "On" },
                { value: "off", label: "Off" },
              ]}
              {...form.getInputProps("carryMode")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
