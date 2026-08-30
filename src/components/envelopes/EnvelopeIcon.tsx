import { ThemeIcon } from "@mantine/core";
import { getEnvelopeIcon } from "@/lib/envelope-icons";
import { resolveEnvelopeColor } from "@/lib/envelope-colors";

interface EnvelopeIconProps {
  icon?: string | null;
  color?: string | null;
  size?: number;
  variant?: "light" | "filled" | "outline" | "transparent" | "default" | "subtle" | "white";
}

export function EnvelopeIcon({
  icon,
  color,
  size = 20,
  variant = "light",
}: EnvelopeIconProps) {
  const Icon = getEnvelopeIcon(icon);
  const resolvedColor = resolveEnvelopeColor(color);

  return (
    <ThemeIcon variant={variant} color={resolvedColor} size={size + 8} radius="md">
      <Icon size={size} stroke={1.5} />
    </ThemeIcon>
  );
}
