"use client";

import { useSession } from "next-auth/react";
import {
  Title,
  Text,
  Card,
  Stack,
  Avatar,
  Group,
  Button,
  Divider,
} from "@mantine/core";
import { IconUser, IconLock, IconBell } from "@tabler/icons-react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <Stack>
      <Title order={2}>Settings</Title>

      <Card withBorder>
        <Group>
          <Avatar
            src={session?.user?.image}
            size="lg"
            radius="xl"
          >
            {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0)}
          </Avatar>
          <div>
            <Text fw={500}>{session?.user?.name || "User"}</Text>
            <Text size="sm" c="dimmed">
              {session?.user?.email}
            </Text>
          </div>
        </Group>
      </Card>

      <Card withBorder>
        <Stack>
          <Group>
            <IconUser size={20} />
            <Text fw={500}>Profile Settings</Text>
          </Group>
          <Text size="sm" c="dimmed">
            Manage your profile information and preferences.
          </Text>
          <Button variant="light" w="fit-content" disabled>
            Edit Profile (Coming Soon)
          </Button>
        </Stack>
      </Card>

      <Card withBorder>
        <Stack>
          <Group>
            <IconLock size={20} />
            <Text fw={500}>Security</Text>
          </Group>
          <Text size="sm" c="dimmed">
            Change your password and manage security settings.
          </Text>
          <Button variant="light" w="fit-content" disabled>
            Change Password (Coming Soon)
          </Button>
        </Stack>
      </Card>

      <Card withBorder>
        <Stack>
          <Group>
            <IconBell size={20} />
            <Text fw={500}>Notifications</Text>
          </Group>
          <Text size="sm" c="dimmed">
            Configure how you receive notifications about your budgets.
          </Text>
          <Button variant="light" w="fit-content" disabled>
            Notification Settings (Coming Soon)
          </Button>
        </Stack>
      </Card>

      <Divider />

      <Text size="sm" c="dimmed">
        Budget App v0.1.0
      </Text>
    </Stack>
  );
}
