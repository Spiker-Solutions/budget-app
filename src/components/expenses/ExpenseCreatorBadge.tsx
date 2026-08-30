import { Avatar, Group, Text } from "@mantine/core";

type ExpenseCreator = {
  name: string | null;
  email: string;
  image?: string | null;
};

function getDisplayName(user: ExpenseCreator): string {
  return user.name || user.email.split("@")[0];
}

interface ExpenseCreatorBadgeProps {
  user: ExpenseCreator;
}

export function ExpenseCreatorBadge({ user }: ExpenseCreatorBadgeProps) {
  const displayName = getDisplayName(user);

  return (
    <Group gap="xs" wrap="nowrap">
      <Avatar src={user.image} size="sm" radius="xl">
        {displayName.charAt(0).toUpperCase()}
      </Avatar>
      <Text size="sm" lineClamp={1}>
        {displayName}
      </Text>
    </Group>
  );
}
