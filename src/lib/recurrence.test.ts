import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  countOccurrencesInRange,
  getOccurrenceDatesInRange,
  occursInRange,
} from "@/lib/recurrence";
import type { PeriodBounds } from "@/lib/budget-period";

function period(start: string, end: string): PeriodBounds {
  return {
    start: new Date(start + "T00:00:00"),
    end: new Date(end + "T23:59:59.999"),
  };
}

describe("getOccurrenceDatesInRange", () => {
  it("returns weekly occurrences aligned to the anchor weekday", () => {
    const anchor = new Date("2026-01-07T00:00:00");
    const dates = getOccurrenceDatesInRange(
      anchor,
      "WEEKLY",
      null,
      period("2026-01-20", "2026-02-10")
    );

    assert.deepEqual(
      dates.map((d) => d.toISOString().slice(0, 10)),
      ["2026-01-21", "2026-01-28", "2026-02-04"]
    );
  });

  it("returns bi-weekly occurrences every 14 days from the anchor", () => {
    const anchor = new Date("2026-01-03T00:00:00");
    const dates = getOccurrenceDatesInRange(
      anchor,
      "BIWEEKLY",
      null,
      period("2026-01-01", "2026-02-28")
    );

    assert.deepEqual(
      dates.map((d) => d.toISOString().slice(0, 10)),
      ["2026-01-03", "2026-01-17", "2026-01-31", "2026-02-14", "2026-02-28"]
    );
  });

  it("clamps monthly occurrences to shorter months", () => {
    const anchor = new Date("2026-01-31T00:00:00");
    const dates = getOccurrenceDatesInRange(
      anchor,
      "MONTHLY",
      null,
      period("2026-01-01", "2026-04-30")
    );

    assert.deepEqual(
      dates.map((d) => d.toISOString().slice(0, 10)),
      ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]
    );
  });

  it("respects recurrenceEndDate inclusively", () => {
    const anchor = new Date("2026-01-01T00:00:00");
    const endDate = new Date("2026-01-15T00:00:00");
    const count = countOccurrencesInRange(
      anchor,
      "DAILY",
      endDate,
      period("2026-01-01", "2026-01-31")
    );

    assert.equal(count, 15);
  });

  it("excludes a later occurrence when end date is before the next scheduled date", () => {
    const anchor = new Date("2026-08-20T00:00:00");
    const endDate = new Date("2026-09-10T00:00:00");

    assert.deepEqual(
      getOccurrenceDatesInRange(
        anchor,
        "MONTHLY",
        endDate,
        period("2026-08-01", "2026-08-31")
      ).map((d) => d.toISOString().slice(0, 10)),
      ["2026-08-20"]
    );

    assert.equal(
      countOccurrencesInRange(
        anchor,
        "MONTHLY",
        endDate,
        period("2026-09-01", "2026-09-30")
      ),
      0
    );
  });

  it("returns no occurrences before the anchor date", () => {
    const anchor = new Date("2026-03-15T00:00:00");
    assert.equal(
      occursInRange(anchor, "MONTHLY", null, period("2026-01-01", "2026-02-28")),
      false
    );
  });

  it("returns yearly occurrences on the anchor month and day", () => {
    const anchor = new Date("2024-02-29T00:00:00");
    const dates = getOccurrenceDatesInRange(
      anchor,
      "YEARLY",
      null,
      period("2025-01-01", "2028-12-31")
    );

    assert.deepEqual(
      dates.map((d) => d.toISOString().slice(0, 10)),
      ["2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]
    );
  });
});
