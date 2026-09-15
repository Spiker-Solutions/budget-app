import type { GoalType } from "@prisma/client";

function clampPercent(percent: number): number {
  return Math.min(100, Math.max(0, percent));
}

function hslToHex(h: number, sPercent: number, lPercent: number): string {
  const s = sPercent / 100;
  const l = lPercent / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Save: light teal-gray → deeper teal → Mantine green at 100%. */
export function saveGoalProgressHex(percent: number): string {
  const p = clampPercent(percent);
  if (p >= 100) {
    return "#40c057";
  }
  const t = p / 100;
  const h = lerp(165, 145, t);
  const s = lerp(35, 55, t);
  const l = lerp(88, 42, t);
  return hslToHex(h, s, l);
}

/** Debt: red → yellow at 50% → green at 100%. */
export function debtGoalProgressHex(percent: number): string {
  const p = clampPercent(percent);
  if (p >= 100) {
    return "#40c057";
  }
  if (p <= 50) {
    const t = p / 50;
    const h = lerp(0, 48, t);
    const s = lerp(75, 90, t);
    const l = lerp(52, 52, t);
    return hslToHex(h, s, l);
  }
  const t = (p - 50) / 50;
  const h = lerp(48, 130, t);
  const s = lerp(90, 55, t);
  const l = lerp(52, 42, t);
  return hslToHex(h, s, l);
}

export function goalProgressHex(type: GoalType, percent: number): string {
  return type === "SAVE" ? saveGoalProgressHex(percent) : debtGoalProgressHex(percent);
}

/** Mantine badge color (approximate) for percent pill. */
export function goalProgressBadgeColor(type: GoalType, percent: number): string {
  const p = clampPercent(percent);
  if (p >= 100) return "green";
  if (type === "DEBT") {
    if (p < 35) return "red";
    if (p < 65) return "yellow";
    return "lime";
  }
  if (p < 40) return "gray";
  if (p < 75) return "teal";
  return "green";
}

/** Pass to Mantine `<Progress color={...} />` — hex is supported via getThemeColor. */
export function goalProgressBarColor(type: GoalType, percent: number): string {
  return goalProgressHex(type, percent);
}

export function goalProgressBarStyles(type: GoalType, percent: number) {
  const fill = goalProgressHex(type, percent);
  return {
    section: {
      "--progress-section-color": fill,
      transition: "background-color 200ms ease",
    },
  } as const;
}
