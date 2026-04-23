import {
  Button,
  Container,
  Title,
  Text,
  Stack,
  Group,
  ThemeIcon,
  SimpleGrid,
  Card,
} from "@mantine/core";
import {
  IconWallet,
  IconChartPie,
  IconUsers,
  IconRefresh,
} from "@tabler/icons-react";
import Link from "next/link";

const features = [
  {
    icon: IconWallet,
    title: "Envelope Budgeting",
    description:
      "Allocate your money into virtual envelopes for different spending categories.",
  },
  {
    icon: IconChartPie,
    title: "Track Expenses",
    description:
      "Log expenses and see exactly where your money goes each period.",
  },
  {
    icon: IconUsers,
    title: "Collaborate",
    description:
      "Share budgets with family members or partners and manage finances together.",
  },
  {
    icon: IconRefresh,
    title: "Flexible Periods",
    description:
      "Set up weekly, bi-weekly, monthly, or custom budget periods that work for you.",
  },
];

export default function HomePage() {
  return (
    <Container size="lg" py="xl">
      <Stack align="center" gap="xl" mt={60}>
        <Stack align="center" gap="sm">
          <Title order={1} ta="center">
            Take Control of Your Finances
          </Title>
          <Text size="xl" c="dimmed" ta="center" maw={600}>
            A simple, powerful envelope budgeting app to help you manage your
            money and reach your financial goals.
          </Text>
        </Stack>

        <Group>
          <Button component={Link} href="/register" size="lg">
            Get Started
          </Button>
          <Button component={Link} href="/login" size="lg" variant="outline">
            Sign In
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mt={40}>
          {features.map((feature) => (
            <Card key={feature.title} shadow="sm" padding="lg" radius="md" withBorder>
              <Group>
                <ThemeIcon size={40} radius="md" variant="light">
                  <feature.icon size={24} />
                </ThemeIcon>
                <div>
                  <Text fw={500}>{feature.title}</Text>
                  <Text size="sm" c="dimmed">
                    {feature.description}
                  </Text>
                </div>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
