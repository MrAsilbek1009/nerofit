import type { MealLog } from "@/types/db";

// Pure helpers for the fast-log surfaces (recents / favorites / saved meals).
// No imports with runtime side effects (the `import type` above is erased),
// so this stays unit-testable without the RN/native environment.

// A deduped "log it again" entry derived from recent meal_logs rows.
export type RecentFood = {
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

type RecentSourceLog = Pick<
  MealLog,
  "name" | "kcal" | "protein_g" | "carbs_g" | "fats_g"
>;

// Turn recent meal_logs (newest first) into a unique recents list: dedupe by
// case-insensitive trimmed name (first = most recent wins), drop rows that
// aren't re-loggable (no name, or no calories), coerce null macros to 0.
export function recentFoodsFromLogs(
  logs: readonly RecentSourceLog[],
  limit = 10,
): RecentFood[] {
  const seen = new Set<string>();
  const out: RecentFood[] = [];
  for (const log of logs) {
    const name = log.name?.trim() ?? "";
    if (!name || !log.kcal) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      kcal: log.kcal,
      protein_g: log.protein_g ?? 0,
      carbs_g: log.carbs_g ?? 0,
      fats_g: log.fats_g ?? 0,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export type MealItemMacros = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

// Totals for a saved meal combo (denormalized onto user_meals at save time).
export function sumMealItems(items: readonly MealItemMacros[]): MealItemMacros {
  const total = { kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0 };
  for (const item of items) {
    total.kcal += item.kcal;
    total.protein_g += item.protein_g;
    total.carbs_g += item.carbs_g;
    total.fats_g += item.fats_g;
  }
  return {
    kcal: Math.round(total.kcal),
    protein_g: Math.round(total.protein_g),
    carbs_g: Math.round(total.carbs_g),
    fats_g: Math.round(total.fats_g),
  };
}
