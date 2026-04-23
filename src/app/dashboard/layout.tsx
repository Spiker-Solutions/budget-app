"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AppShell,
  Burger,
  Group,
  Skeleton,
  Text,
  NavLink,
  Stack,
  Select,
  Divider,
  ActionIcon,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconWallet,
  IconHome,
  IconCreditCard,
  IconSettings,
  IconLogout,
  IconSun,
  IconMoon,
  IconPlus,
} from "@tabler/icons-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useBudgetStore } from "@/stores/budgetStore";
import { useUiStore } from "@/stores/uiStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [opened, { toggle }] = useDisclosure();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const { budgets, fetchBudgets, isLoading: budgetsLoading } = useBudgetStore();
  const { currentBudgetId, setCurrentBudgetId } = useUiStore();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchBudgets();
    }
  }, [status, fetchBudgets]);

  useEffect(() => {
    if (budgets.length > 0 && !currentBudgetId) {
      setCurrentBudgetId(budgets[0].id);
    }
  }, [budgets, currentBudgetId, setCurrentBudgetId]);

  if (status === "loading") {
    return (
      <AppShell padding="md">
        <Stack p="md">
          <Skeleton height={40} />
          <Skeleton height={200} />
          <Skeleton height={200} />
        </Stack>
      </AppShell>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const budgetOptions = budgets.map((b) => ({
    value: b.id,
    label: b.name,
  }));

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <IconWallet size={28} />
            <Text fw={600} size="lg">
              Budget App
            </Text>
          </Group>
          <Group>
            <ActionIcon
              variant="subtle"
              onClick={() => toggleColorScheme()}
              size="lg"
            >
              {colorScheme === "dark" ? (
                <IconSun size={20} />
              ) : (
                <IconMoon size={20} />
              )}
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="sm">
          {budgetsLoading ? (
            <Skeleton height={36} />
          ) : (
            <Group gap="xs">
              {budgetOptions.length > 0 ? (
                <Select
                  placeholder="Select a budget"
                  data={budgetOptions}
                  value={currentBudgetId}
                  onChange={(value) => setCurrentBudgetId(value)}
                  allowDeselect={false}
                  style={{ flex: 1 }}
                />
              ) : (
                <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                  No budgets yet
                </Text>
              )}
              <ActionIcon
                component={Link}
                href="/dashboard/budgets/new"
                variant="light"
                size="lg"
                title="Create new budget"
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Group>
          )}

          <Divider />

          <NavLink
            component={Link}
            href="/dashboard"
            label="Dashboard"
            leftSection={<IconHome size={20} />}
          />

          <NavLink
            component={Link}
            href="/dashboard/expenses"
            label="Expenses"
            leftSection={<IconCreditCard size={20} />}
          />

          <NavLink
            component={Link}
            href="/dashboard/settings"
            label="Settings"
            leftSection={<IconSettings size={20} />}
          />

          <Divider />

          <NavLink
            label="Sign out"
            leftSection={<IconLogout size={20} />}
            onClick={() => signOut({ callbackUrl: "/" })}
            c="red"
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
