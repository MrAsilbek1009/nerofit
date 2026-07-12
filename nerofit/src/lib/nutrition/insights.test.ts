import { describe, expect, it } from "@jest/globals";
import { computeLogStreak, trailingKcal, weekDots, type WeekDot } from "./insights";

// 2026-07-22 is a Wednesday; its week runs Mon 2026-07-20 .. Sun 2026-07-26.
const WEDNESDAY = "2026-07-22";

describe("computeLogStreak", () => {
  it("counts a run ending today", () => {
    const streak = computeLogStreak(
      ["2026-07-20", "2026-07-21", "2026-07-22"],
      WEDNESDAY,
    );
    expect(streak).toBe(3);
  });

  it("anchors on yesterday when today has no logs yet", () => {
    // Unlogged morning: the streak through yesterday still counts.
    const streak = computeLogStreak(
      ["2026-07-19", "2026-07-20", "2026-07-21"],
      WEDNESDAY,
    );
    expect(streak).toBe(3);
  });

  it("stops at a gap in the run", () => {
    // 07-19 is orphaned by the missing 07-20.
    const streak = computeLogStreak(
      ["2026-07-19", "2026-07-21", "2026-07-22"],
      WEDNESDAY,
    );
    expect(streak).toBe(2);
  });

  it("is 0 when neither today nor yesterday is logged", () => {
    expect(computeLogStreak(["2026-07-18", "2026-07-19"], WEDNESDAY)).toBe(0);
  });

  it("is 0 with no logs at all", () => {
    expect(computeLogStreak([], WEDNESDAY)).toBe(0);
  });

  it("ignores duplicate day keys", () => {
    const streak = computeLogStreak(
      ["2026-07-22", "2026-07-22", "2026-07-21", "2026-07-21"],
      WEDNESDAY,
    );
    expect(streak).toBe(2);
  });

  it("counts across a month boundary", () => {
    const streak = computeLogStreak(
      ["2026-07-30", "2026-07-31", "2026-08-01"],
      "2026-08-01",
    );
    expect(streak).toBe(3);
  });
});

describe("weekDots", () => {
  it("returns exactly Mon..Sun of the current week for a mid-week today", () => {
    const dots = weekDots([], WEDNESDAY);
    expect(dots).toHaveLength(7);
    expect(dots.map((d) => d.day)).toEqual([
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
    ]);
    expect(dots.map((d) => d.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("anchors a Sunday today to the preceding Monday", () => {
    const dots = weekDots([], "2026-07-26");
    expect(dots[0]!.day).toBe("2026-07-20");
    expect(dots[6]!.day).toBe("2026-07-26");
    expect(dots[6]!.isToday).toBe(true);
  });

  it("anchors a Monday today to itself", () => {
    const dots = weekDots([], "2026-07-20");
    expect(dots[0]!.day).toBe("2026-07-20");
    expect(dots[0]!.isToday).toBe(true);
  });

  it("flags logged days and marks isToday exactly once", () => {
    const dots = weekDots(["2026-07-20", "2026-07-22"], WEDNESDAY);
    expect(dots.map((d) => d.logged)).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    const todays = dots.filter((d: WeekDot) => d.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0]!.day).toBe(WEDNESDAY);
    expect(todays[0]!.dayIndex).toBe(2);
  });

  it("never marks days after today as logged", () => {
    // A stray future key (e.g. clock skew) must not light up Friday.
    const dots = weekDots(["2026-07-24"], WEDNESDAY);
    expect(dots[4]!.day).toBe("2026-07-24");
    expect(dots[4]!.logged).toBe(false);
  });
});

describe("trailingKcal", () => {
  it("zero-fills missing days, oldest to newest", () => {
    const { values, avg } = trailingKcal(
      [
        { date: "2026-07-21", kcal: 2000 },
        { date: "2026-07-19", kcal: 1800 },
      ],
      WEDNESDAY,
    );
    // Window is 2026-07-16 .. 2026-07-22.
    expect(values).toEqual([0, 0, 0, 1800, 0, 2000, 0]);
    // Average over logged days only — zeros don't drag it down.
    expect(avg).toBe(1900);
  });

  it("returns all zeros and avg 0 for empty input", () => {
    const { values, avg } = trailingKcal([], WEDNESDAY);
    expect(values).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(avg).toBe(0);
  });

  it("includes today and yesterday, excludes the day exactly `days` ago", () => {
    const { values } = trailingKcal(
      [
        { date: "2026-07-15", kcal: 1500 }, // exactly 7 days ago → outside
        { date: "2026-07-16", kcal: 1600 }, // oldest in-window day
        { date: "2026-07-21", kcal: 2100 }, // yesterday
        { date: "2026-07-22", kcal: 2200 }, // today
      ],
      WEDNESDAY,
    );
    expect(values).toEqual([1600, 0, 0, 0, 0, 2100, 2200]);
  });

  it("rounds the average", () => {
    const { avg } = trailingKcal(
      [
        { date: "2026-07-21", kcal: 2000 },
        { date: "2026-07-22", kcal: 1801 },
      ],
      WEDNESDAY,
    );
    expect(avg).toBe(1901); // round(1900.5)
  });

  it("respects a custom window size", () => {
    const { values, avg } = trailingKcal(
      [
        { date: "2026-07-19", kcal: 1900 }, // outside a 3-day window
        { date: "2026-07-20", kcal: 2000 },
        { date: "2026-07-22", kcal: 2400 },
      ],
      WEDNESDAY,
      3,
    );
    expect(values).toEqual([2000, 0, 2400]);
    expect(avg).toBe(2200);
  });
});
