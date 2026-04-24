"use client";

import { useEffect, useMemo } from "react";
import { Group, Text, ActionIcon, Menu, UnstyledButton } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconChevronDown } from "@tabler/icons-react";
import dayjs from "dayjs";
import {
  buildBudgetPeriodWindow,
  getPeriodContaining,
  type BudgetPeriodInput,
  type PeriodBounds,
} from "@/lib/budget-period";
import { useUiStore } from "@/stores/uiStore";

function periodsEqual(a: PeriodBounds, b: PeriodBounds): boolean {
  return a.start.getTime() === b.start.getTime() && a.end.getTime() === b.end.getTime();
}

function formatPeriodLabel(p: PeriodBounds): string {
  return `${dayjs(p.start).format("MMM D, YYYY")} – ${dayjs(p.end).format("MMM D, YYYY")}`;
}

type BudgetPeriodNavigatorProps = {
  budgetInput: BudgetPeriodInput;
};

export function BudgetPeriodNavigator({ budgetInput }: BudgetPeriodNavigatorProps) {
  const { viewingPeriodStartMs, setViewingPeriodStartMs } = useUiStore();

  const periodWindow = useMemo(() => buildBudgetPeriodWindow(budgetInput), [budgetInput]);

  useEffect(() => {
    if (viewingPeriodStartMs === null) return;
    const inWindow = periodWindow.some((p) => p.start.getTime() === viewingPeriodStartMs);
    if (!inWindow) {
      setViewingPeriodStartMs(null);
    }
  }, [periodWindow, viewingPeriodStartMs, setViewingPeriodStartMs]);

  const calendarCurrent = useMemo(
    () => getPeriodContaining(new Date(), budgetInput),
    [budgetInput]
  );

  const selectedPeriod = useMemo((): PeriodBounds => {
    if (viewingPeriodStartMs === null) {
      return calendarCurrent;
    }
    const found = periodWindow.find((p) => p.start.getTime() === viewingPeriodStartMs);
    return found ?? calendarCurrent;
  }, [viewingPeriodStartMs, periodWindow, calendarCurrent]);

  const selectedIndex = useMemo(() => {
    const i = periodWindow.findIndex((p) => periodsEqual(p, selectedPeriod));
    return i >= 0 ? i : periodWindow.findIndex((p) => periodsEqual(p, calendarCurrent));
  }, [periodWindow, selectedPeriod, calendarCurrent]);

  const canGoPrev = selectedIndex > 0;
  const canGoNext = selectedIndex >= 0 && selectedIndex < periodWindow.length - 1;

  const goToPeriod = (p: PeriodBounds) => {
    if (periodsEqual(p, calendarCurrent)) {
      setViewingPeriodStartMs(null);
    } else {
      setViewingPeriodStartMs(p.start.getTime());
    }
  };

  const handlePrev = () => {
    if (!canGoPrev) return;
    goToPeriod(periodWindow[selectedIndex - 1]!);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    goToPeriod(periodWindow[selectedIndex + 1]!);
  };

  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <Text size="sm" c="dimmed" fw={500} style={{ flexShrink: 0 }}>
        Budget period:
      </Text>
      {canGoPrev ? (
        <ActionIcon variant="subtle" size="sm" onClick={handlePrev} aria-label="Previous period">
          <IconChevronLeft size={18} />
        </ActionIcon>
      ) : (
        <span style={{ width: 28 }} />
      )}
      <Menu position="bottom-start" withinPortal>
        <Menu.Target>
          <UnstyledButton>
            <Group gap={4} wrap="nowrap">
              <Text size="sm" c="dimmed">
                {formatPeriodLabel(selectedPeriod)}
              </Text>
              <IconChevronDown size={14} style={{ opacity: 0.6 }} />
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          {periodWindow.map((p) => {
            const isCalendar = periodsEqual(p, calendarCurrent);
            return (
              <Menu.Item key={p.start.getTime()} onClick={() => goToPeriod(p)}>
                {formatPeriodLabel(p)}
                {isCalendar ? " (current)" : ""}
              </Menu.Item>
            );
          })}
        </Menu.Dropdown>
      </Menu>
      {canGoNext ? (
        <ActionIcon variant="subtle" size="sm" onClick={handleNext} aria-label="Next period">
          <IconChevronRight size={18} />
        </ActionIcon>
      ) : (
        <span style={{ width: 28 }} />
      )}
    </Group>
  );
}
