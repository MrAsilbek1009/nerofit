import { describe, expect, it } from "@jest/globals";
import {
  computeBadges,
  WEEKLY_LOG_GOAL_DAYS,
  weeklyGoalProgress,
  type BadgeInputs,
} from "./badges";

const ZERO: BadgeInputs = {
  streak: 0,
  weekLoggedDays: 0,
  totalLogs: 0,
  totalScans: 0,
  foodsSubmitted: 0,
};

function badge(inputs: Partial<BadgeInputs>, id: string) {
  const b = computeBadges({ ...ZERO, ...inputs }).find((x) => x.id === id);
  if (!b) throw new Error(`missing badge ${id}`);
  return b;
}

describe("computeBadges", () => {
  it("returns all six badges, locked at zero", () => {
    const all = computeBadges(ZERO);
    expect(all).toHaveLength(6);
    expect(all.every((b) => !b.achieved && b.current === 0)).toBe(true);
  });

  it("unlocks streak badges at their thresholds", () => {
    expect(badge({ streak: 6 }, "streak7").achieved).toBe(false);
    expect(badge({ streak: 7 }, "streak7").achieved).toBe(true);
    expect(badge({ streak: 7 }, "streak30").achieved).toBe(false);
    expect(badge({ streak: 30 }, "streak30").achieved).toBe(true);
  });

  it("caps current at the target for the progress caption", () => {
    expect(badge({ streak: 45 }, "streak7")).toMatchObject({ current: 7, target: 7 });
    expect(badge({ totalLogs: 250 }, "logs100")).toMatchObject({ current: 100, target: 100 });
  });

  it("tracks lifetime counters", () => {
    expect(badge({ totalLogs: 99 }, "logs100").achieved).toBe(false);
    expect(badge({ totalLogs: 100 }, "logs100").achieved).toBe(true);
    expect(badge({ totalScans: 10 }, "scans10").achieved).toBe(true);
    expect(badge({ foodsSubmitted: 1 }, "foodAdded").achieved).toBe(true);
  });

  it("unlocks the perfect week only at 7/7", () => {
    expect(badge({ weekLoggedDays: 6 }, "weekPerfect").achieved).toBe(false);
    expect(badge({ weekLoggedDays: 7 }, "weekPerfect").achieved).toBe(true);
  });
});

describe("weeklyGoalProgress", () => {
  it("ratios against the fixed goal and clamps", () => {
    expect(weeklyGoalProgress(0)).toEqual({ logged: 0, target: WEEKLY_LOG_GOAL_DAYS, ratio: 0 });
    expect(weeklyGoalProgress(3).ratio).toBeCloseTo(3 / WEEKLY_LOG_GOAL_DAYS);
    expect(weeklyGoalProgress(7).ratio).toBe(1);
  });
});
