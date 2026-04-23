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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { useEnvelopeStore } from "@/stores/envelopeStore";
import type { UpdateEnvelopeInput } from "@/types";

export default function EditEnvelopePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [envelope, setEnvelope] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { updateEnvelope, fetchEnvelopes } = useEnvelopeStore();

  const form = useForm<UpdateEnvelopeInput>({
    initialValues: {
      name: "",
      allocation: 0,
      description: "",
    },
    validate: {
      name: (value) => (value && value.length < 1 ? "Name is required" : null),
      allocation: (value) =>
        value !== undefined && value <= 0 ? "Allocation must be greater than 0" : null,
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
          form.setValues({
            name: data.data.name,
            allocation: Number(data.data.allocation),
            description: data.data.description || "",
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
  }, [params.id, router]);

  const handleSubmit = async (values: UpdateEnvelopeInput) => {
    setSaving(true);

    try {
      const success = await updateEnvelope(params.id, values);

      if (success) {
        notifications.show({
          title: "Envelope updated",
          message: `"${values.name}" has been updated successfully`,
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
