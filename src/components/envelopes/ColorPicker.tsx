"use client";

import { ColorSwatch, Group, CheckIcon } from "@mantine/core";
import {
  DEFAULT_ENVELOPE_COLOR,
  ENVELOPE_COLORS,
  type EnvelopeColorName,
} from "@/lib/envelope-colors";

interface ColorPickerProps {
  value: string | null;
  onChange: (value: EnvelopeColorName) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const selected = value ?? DEFAULT_ENVELOPE_COLOR;

  return (
    <Group gap="xs">
      {ENVELOPE_COLORS.map((color) => (
        <ColorSwatch
          key={color}
          color={`var(--mantine-color-${color}-6)`}
          size={28}
          radius="md"
          onClick={() => onChange(color)}
          aria-label={`${color} color`}
          aria-pressed={selected === color}
          style={{ cursor: "pointer" }}
        >
          {selected === color && <CheckIcon size={12} color="white" stroke="3" />}
        </ColorSwatch>
      ))}
    </Group>
  );
}
