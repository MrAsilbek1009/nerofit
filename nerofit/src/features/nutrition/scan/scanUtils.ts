import type { FoodScanMacros, FoodScanResult } from "@/lib/api/foodScan";
import type { MealSlot } from "@/types/db";

// Shared helpers for the food-scan flow (photo / barcode / search).

export const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

// Display title for a scan: the first detected item's name, else a fallback.
export function scanTitle(result: FoodScanResult, fallback: string): string {
  return result.items[0]?.name?.trim() || fallback;
}

export function emptyMacros(): FoodScanMacros {
  return { kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0 };
}

// ---- Amount editing (servings vs grams) ----

export type AmountUnit = "serving" | "gram";

// Multiplier applied to the base estimate. Serving mode scales by count; gram
// mode scales against the estimated total weight (guarded: bad total → 1).
export function amountFactor(
  unit: AmountUnit,
  servings: number,
  grams: number,
  totalG: number | null | undefined,
): number {
  if (unit === "gram") {
    if (!totalG || totalG <= 0) return 1;
    return grams / totalG;
  }
  return servings;
}

// Slider bounds for gram mode: 5g steps from one step up to 3× the estimate
// (rounded up to a step), so both "I ate a bit" and "double portion" fit.
export function gramRange(totalG: number): { min: number; max: number; step: number } {
  const step = 5;
  const max = Math.max(step * 2, Math.ceil((totalG * 3) / step) * step);
  return { min: step, max, step };
}

// Best-guess meal slot from the time of day.
export function defaultSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}
