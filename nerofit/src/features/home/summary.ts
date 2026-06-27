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
