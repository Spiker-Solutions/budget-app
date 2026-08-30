/** Mantine theme color names supported for envelope accents. */
export const ENVELOPE_COLORS = [
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "yellow",
  "orange",
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
  "gray",
] as const;

export type EnvelopeColorName = (typeof ENVELOPE_COLORS)[number];

export const DEFAULT_ENVELOPE_COLOR: EnvelopeColorName = "blue";

export function isEnvelopeColorName(value: string): value is EnvelopeColorName {
  return (ENVELOPE_COLORS as readonly string[]).includes(value);
}

export function resolveEnvelopeColor(color: string | null | undefined): EnvelopeColorName {
  if (color && isEnvelopeColorName(color)) return color;
  return DEFAULT_ENVELOPE_COLOR;
}
