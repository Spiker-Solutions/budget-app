"use client";

import { SimpleGrid, Tooltip, UnstyledButton } from "@mantine/core";
import { ENVELOPE_ICONS } from "@/lib/envelope-icons";
import { resolveEnvelopeColor } from "@/lib/envelope-colors";

interface IconPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  color?: string | null;
}

export function IconPicker({ value, onChange, color }: IconPickerProps) {
  const accentColor = resolveEnvelopeColor(color);

  return (
    <SimpleGrid cols={{ base: 6, sm: 8 }} spacing="xs">
      {ENVELOPE_ICONS.map(({ name, label, icon: Icon }) => {
        const selected = value === name;

        return (
          <Tooltip key={name} label={label} withArrow>
            <UnstyledButton
              onClick={() => onChange(selected ? null : name)}
              aria-label={label}
              aria-pressed={selected}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                aspectRatio: "1",
                borderRadius: "var(--mantine-radius-md)",
                border: selected
                  ? `2px solid var(--mantine-color-${accentColor}-filled)`
                  : "1px solid var(--mantine-color-default-border)",
                backgroundColor: selected
                  ? `var(--mantine-color-${accentColor}-light)`
                  : "var(--mantine-color-default)",
                color: selected
                  ? `var(--mantine-color-${accentColor}-filled)`
                  : "var(--mantine-color-text)",
              }}
            >
              <Icon size={22} stroke={1.5} />
            </UnstyledButton>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}
