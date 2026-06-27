import type { MealLog } from "@/types/db";

export type MacroTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
};

// Sum today's logged meals into calorie + macro totals.
export function sumMealLogs(logs: MealLog[]): MacroTotals {
  return logs.reduce<MacroTotals>(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal ?? 0),
      protein: acc.protein + (m.protein_g ?? 0),
      carbs: acc.carbs + (m.carbs_g ?? 0),
      fats: acc.fats + (m.fats_g ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

// profiles has no explicit calorie goal — derive it from the macro goals using
// Atwater factors (4 kcal/g protein & carbs, 9 kcal/g fat).
export function deriveCalorieGoal(p: {
  protein_goal_g: number;
  carbs_goal_g: number;
  fats_goal_g: number;
}): number {
  return Math.round(4 * p.protein_goal_g + 4 * p.carbs_goal_g + 9 * p.fats_goal_g);
}

// Remaining toward a goal, never negative; rounded for display.
export function remaining(goal: number, consumed: number): number {
  return Math.max(0, Math.round(goal - consumed));
}

// Fraction consumed 0..1 (guards divide-by-zero).
export function consumedFraction(goal: number, consumed: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(1, consumed / goal));
}

// ── Micronutrients & Health Score ─────────────────────────────────────────
// Daily general-population targets. Fiber is a "hit at least" target; sugar and
// sodium are "stay under" limits.
export const MICRO_TARGETS = { fiber: 28, sugar: 36, sodium: 2300 } as const;

export type MicroTotals = {
  fiber: number;
  sugar: number;
  sodium: number;
  netCarbs: number;
  // True once at least one logged meal carries any micro value — until then the
  // Health Score is N/A (columns are nullable; populated later from the catalog
  // or food scan).
  hasData: boolean;
};

export function sumMicros(logs: MealLog[]): MicroTotals {
  let fiber = 0;
  let sugar = 0;
  let sodium = 0;
  let carbs = 0;
  let hasData = false;
  for (const m of logs) {
    if (m.fiber_g != null || m.sugar_g != null || m.sodium_mg != null) hasData = true;
    fiber += m.fiber_g ?? 0;
    sugar += m.sugar_g ?? 0;
    sodium += m.sodium_mg ?? 0;
    carbs += m.carbs_g ?? 0;
  }
  return { fiber, sugar, sodium, netCarbs: Math.max(0, carbs - fiber), hasData };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// 0..10 health score from fiber (hit target) + sugar/sodium (stay under), or
// null when there's no micro data yet.
export function computeHealthScore(micros: MicroTotals): number | null {
  if (!micros.hasData) return null;
  const fiberScore = clamp01(micros.fiber / MICRO_TARGETS.fiber);
  const sugarScore = clamp01(1 - Math.max(0, micros.sugar - MICRO_TARGETS.sugar) / MICRO_TARGETS.sugar);
  const sodiumScore = clamp01(1 - Math.max(0, micros.sodium - MICRO_TARGETS.sodium) / MICRO_TARGETS.sodium);
  return Math.round(((fiberScore + sugarScore + sodiumScore) / 3) * 10);
}

export type HealthBand = "good" | "fair" | "poor";

export function healthBand(score: number): HealthBand {
  if (score >= 7) return "good";
  if (score >= 4) return "fair";
  return "poor";
}

// Whether a micro value is within healthy bounds (drives the row dot colour).
export function microIsGood(kind: "fiber" | "sugar" | "sodium", value: number): boolean {
  if (kind === "fiber") return value >= MICRO_TARGETS.fiber;
  return value <= MICRO_TARGETS[kind];
}
