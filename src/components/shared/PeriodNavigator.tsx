"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Popover,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { PeriodBounds } from "@/lib/budget-period";
import dayjs from "dayjs";

const STATUS_HEIGHT = 22;

interface PeriodNavigatorProps {
  period: PeriodBounds;
  referenceDate: Date;
  isCurrentPeriod: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  hasMultiplePeriods: boolean;
  minDate: Date;
  maxDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onCurrent: () => void;
  onSelectDate: (date: Date) => void;
}

export function PeriodNavigator({
  period,
  referenceDate,
  isCurrentPeriod,
  canGoPrevious,
  canGoNext,
  hasMultiplePeriods,
  minDate,
  maxDate,
  onPrevious,
  onNext,
  onCurrent,
  onSelectDate,
}: PeriodNavigatorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const label = `${dayjs(period.start).format("MMM D, YYYY")} – ${dayjs(period.end).format("MMM D, YYYY")}`;

  const dateLabel = hasMultiplePeriods ? (
    <Popover
      opened={pickerOpen}
      onChange={setPickerOpen}
      position="bottom-start"
      withArrow
      shadow="md"
    >
      <Popover.Target>
        <Tooltip label="Jump to period">
          <UnstyledButton
            aria-label="Jump to period by date"
            onClick={() => setPickerOpen((open) => !open)}
            style={{
              borderRadius: "var(--mantine-radius-sm)",
              padding: "2px 4px",
              cursor: "pointer",
            }}
          >
            <Text size="sm" c="blue">
              {label}
            </Text>
          </UnstyledButton>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <DatePicker
          value={referenceDate}
          onChange={(value) => {
            if (value) {
              onSelectDate(value);
              setPickerOpen(false);
            }
          }}
          minDate={minDate}
          maxDate={maxDate}
        />
      </Popover.Dropdown>
    </Popover>
  ) : (
    <Text size="sm" c="dimmed">
      {label}
    </Text>
  );

  const showBackToCurrent = hasMultiplePeriods && !isCurrentPeriod;
  const statusLabel = isCurrentPeriod ? (
    <Badge
      size="sm"
      variant="light"
      h={STATUS_HEIGHT}
      styles={{ root: { display: "inline-flex", alignItems: "center" } }}
    >
      Current
    </Badge>
  ) : showBackToCurrent ? (
    <Button
      variant="subtle"
      size="compact-xs"
      h={STATUS_HEIGHT}
      px="xs"
      onClick={onCurrent}
    >
      Back to current
    </Button>
  ) : null;

  return (
    <Flex
      direction={{ base: "column", sm: "row" }}
      align={{ base: "flex-start", sm: "center" }}
      gap={{ base: 6, sm: "xs" }}
    >
      <Group gap="xs" wrap="nowrap">
        <Tooltip label="Previous period">
          <Button
            variant="subtle"
            size="compact-sm"
            px="xs"
            aria-label="Previous period"
            disabled={!canGoPrevious}
            onClick={onPrevious}
          >
            <IconChevronLeft size={18} />
          </Button>
        </Tooltip>

        {dateLabel}

        <Tooltip label="Next period">
          <Button
            variant="subtle"
            size="compact-sm"
            px="xs"
            aria-label="Next period"
            disabled={!canGoNext}
            onClick={onNext}
          >
            <IconChevronRight size={18} />
          </Button>
        </Tooltip>
      </Group>

      {statusLabel && (
        <Box
          mih={STATUS_HEIGHT}
          style={{ display: "flex", alignItems: "center" }}
        >
          {statusLabel}
        </Box>
      )}
    </Flex>
  );
}
