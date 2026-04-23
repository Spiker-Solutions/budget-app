import { Container, Paper, Stack, Title, Text } from "@mantine/core";
import { IconWallet } from "@tabler/icons-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container size={420} py={40}>
      <Stack align="center" mb="xl">
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Stack align="center" gap="xs">
            <IconWallet size={48} stroke={1.5} />
            <Title order={2}>Budget App</Title>
          </Stack>
        </Link>
        <Text c="dimmed" size="sm" ta="center">
          Envelope budgeting made simple
        </Text>
      </Stack>

      <Paper withBorder shadow="md" p={30} radius="md">
        {children}
      </Paper>
    </Container>
  );
}
