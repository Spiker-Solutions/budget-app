"use client";

import { useState } from "react";
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useEnvelopeStore } from "@/stores/envelopeStore";
import { useUiStore } from "@/stores/uiStore";
import type { CreateEnvelopeInput } from "@/types";

export default function NewEnvelopePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { createEnvelope, fetchEnvelopes } = useEnvelopeStore();
  const { currentBudgetId } = useUiStore();

  const form = useForm<Omit<CreateEnvelopeInput, "budgetId">>({
    initialValues: {
      name: "",
      allocation: 0,
      description: "",
    },
    validate: {
      name: (value) => (value.length < 1 ? "Name is required" : null),
      allocation: (value) =>
        value <= 0 ? "Allocation must be greater than 0" : null,
    },
  });

  const handleSubmit = async (
    values: Omit<CreateEnvelopeInput, "budgetId">
  ) => {
    if (!currentBudgetId) {
      notifications.show({
        title: "Error",
        message: "Please select a budget first",
        color: "red",
      });
      return;
    }

    setLoading(true);

    try {
      const envelope = await createEnvelope({
        ...values,
        budgetId: currentBudgetId,
      });

      if (envelope) {
        notifications.show({
          title: "Envelope created",
          message: `"${envelope.name}" has been created successfully`,
          color: "green",
        });
        await fetchEnvelopes(currentBudgetId);
        router.push("/dashboard");
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to create envelope",
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

  if (!currentBudgetId) {
    return (
      <Stack>
        <Title order={2}>Create New Envelope</Title>
        <Text c="red">Please select a budget first</Text>
      </Stack>
    );
  }

  return (
    <Stack>
      <Title order={2}>Create New Envelope</Title>
      <Text c="dimmed">
        Set up a new envelope to organize your budget into categories.
      </Text>

      <Card withBorder maw={600}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Envelope Name"
              placeholder="e.g., Groceries, Rent, Entertainment"
              required
              {...form.getInputProps("name")}
            />

            <NumberInput
              label="Budget Allocation"
              placeholder="0.00"
              description="How much to allocate for this envelope"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              prefix="$"
              thousandSeparator=","
              {...form.getInputProps("allocation")}
            />

            <Textarea
              label="Description"
              placeholder="Optional description for this envelope"
              {...form.getInputProps("description")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Envelope
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
