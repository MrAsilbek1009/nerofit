// Nutrition badges (Phase 16 N4.1) — few and disciplined, per the pillar
// plan ("kam, brendga mos"). Every badge is DERIVED from existing data at
// read time: no badges table, no awarding engine, nothing to migrate or
// backfill. Pure module: no runtime imports, fully deterministic.

export type BadgeId =
  | "streak7"
  | "streak30"
  | "logs100"
  | "scans10"
  | "foodAdded"
  | "weekPerfect";

export type BadgeState = {
  id: BadgeId;
  achieved: boolean;
  /** Progress toward the target, for the locked-state caption. */
  current: number;
  target: number;
};

export type BadgeInputs = {
  /** Consecutive-day logging streak (computeLogStreak). */
  streak: number;
  /** Days logged in the current Mon-anchored week, 0..7 (weekDots). */
  weekLoggedDays: number;
  /** Lifetime counters (getNutritionStats). */
  totalLogs: number;
  totalScans: number;
  foodsSubmitted: number;
};

const TARGETS: Record<BadgeId, number> = {
  streak7: 7,
  streak30: 30,
  logs100: 100,
  scans10: 10,
  foodAdded: 1,
  weekPerfect: 7,
};

export function computeBadges(inputs: BadgeInputs): BadgeState[] {
  const current: Record<BadgeId, number> = {
    streak7: inputs.streak,
    streak30: inputs.streak,
    logs100: inputs.totalLogs,
    scans10: inputs.totalScans,
    foodAdded: inputs.foodsSubmitted,
    weekPerfect: inputs.weekLoggedDays,
  };
  return (Object.keys(TARGETS) as BadgeId[]).map((id) => ({
    id,
    achieved: current[id] >= TARGETS[id],
    current: Math.min(current[id], TARGETS[id]),
    target: TARGETS[id],
  }));
}

/** Weekly logging goal shown on the daily breakdown (fixed, brand-quiet). */
export const WEEKLY_LOG_GOAL_DAYS = 5;

export function weeklyGoalProgress(weekLoggedDays: number): {
  logged: number;
  target: number;
  ratio: number;
} {
  const logged = Math.max(0, weekLoggedDays);
  return {
    logged,
    target: WEEKLY_LOG_GOAL_DAYS,
    ratio: Math.max(0, Math.min(1, logged / WEEKLY_LOG_GOAL_DAYS)),
  };
}
