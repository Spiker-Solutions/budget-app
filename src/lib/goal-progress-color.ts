import type { GoalType } from "@prisma/client";

/** Color updates every N% (5 = finer steps, 10 = coarser). Bar width still uses exact %. */
export const GOAL_PROGRESS_COLOR_STEP_PERCENT = 10;

function clampPercent(percent: number): number {
  return Math.min(100, Math.max(0, percent));
}

/** Snap progress to the nearest step for fill/badge color only. */
export function snapGoalProgressForColor(
  percent: number,
  step: number = GOAL_PROGRESS_COLOR_STEP_PERCENT
): number {
  const p = clampPercent(percent);
  if (step <= 0) return p;
  if (p >= 100) return 100;
  return Math.min(100, Math.round(p / step) * step);
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

export function goalProgressHex(
  type: GoalType,
  percent: number,
  options?: { step?: number; snap?: boolean }
): string {
  const step = options?.step ?? GOAL_PROGRESS_COLOR_STEP_PERCENT;
  const snap = options?.snap ?? true;
  const p = snap ? snapGoalProgressForColor(percent, step) : clampPercent(percent);
  return type === "SAVE" ? saveGoalProgressHex(p) : debtGoalProgressHex(p);
}

/** Fill color for progress bar (stepped by default). */
export function goalProgressFillHex(type: GoalType, percent: number): string {
  return goalProgressHex(type, percent);
}

/** Mantine Badge `styles` using the same stepped hex as the bar. */
export function goalProgressBadgeStyles(type: GoalType, percent: number) {
  const hex = goalProgressFillHex(type, percent);
  return {
    root: {
      backgroundColor: hexWithAlpha(hex, 0.16),
      color: hex,
      border: `1px solid ${hexWithAlpha(hex, 0.38)}`,
    },
  } as const;
}

/** @deprecated Use goalProgressBadgeStyles — kept for ThemeIcon approximate hues. */
export function goalProgressBadgeColor(type: GoalType, percent: number): string {
  const p = snapGoalProgressForColor(percent);
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
