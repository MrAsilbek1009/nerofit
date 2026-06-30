import { describe, expect, it } from "@jest/globals";
import { computeDayStreak, startOfWeek, toLocalDayKey } from "./streak";

// Noon-local avoids midnight/timezone edge cases when the streak helper parses
// the ISO back into local Y-M-D.
function daysAgoIso(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe("toLocalDayKey", () => {
  it("formats a date as zero-padded local Y-M-D", () => {
    expect(toLocalDayKey(new Date(2026, 5, 29))).toBe("2026-06-29");
    expect(toLocalDayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("computeDayStreak", () => {
  it("is 0 with no completed days", () => {
    expect(computeDayStreak([])).toBe(0);
  });

  it("counts a single day logged today", () => {
    expect(computeDayStreak([daysAgoIso(0)])).toBe(1);
  });

  it("counts consecutive days ending today", () => {
    expect(computeDayStreak([daysAgoIso(0), daysAgoIso(1), daysAgoIso(2)])).toBe(3);
  });

  it("dedupes multiple sessions on the same day", () => {
    expect(computeDayStreak([daysAgoIso(0), daysAgoIso(0), daysAgoIso(1)])).toBe(2);
  });

  it("still counts a streak ending yesterday when today is empty", () => {
    expect(computeDayStreak([daysAgoIso(1), daysAgoIso(2)])).toBe(2);
  });

  it("breaks on a gap", () => {
    // logged today, then a gap (nothing yesterday) → only today counts
    expect(computeDayStreak([daysAgoIso(0), daysAgoIso(2)])).toBe(1);
    // last activity 2 days ago (neither today nor yesterday) → 0
    expect(computeDayStreak([daysAgoIso(2)])).toBe(0);
  });
});

describe("startOfWeek", () => {
  it("anchors to Monday at local midnight", () => {
    // Wed 2026-07-01 → Mon 2026-06-29
    const monday = startOfWeek(new Date(2026, 6, 1, 15, 30));
    expect(monday.getDay()).toBe(1); // Monday
    expect(toLocalDayKey(monday)).toBe("2026-06-29");
    expect(monday.getHours()).toBe(0);
  });

  it("returns the same day when already Monday", () => {
    expect(toLocalDayKey(startOfWeek(new Date(2026, 5, 29)))).toBe("2026-06-29");
  });

  it("maps Sunday back to the week's Monday", () => {
    // Sun 2026-07-05 → Mon 2026-06-29
    expect(toLocalDayKey(startOfWeek(new Date(2026, 6, 5)))).toBe("2026-06-29");
  });
});
