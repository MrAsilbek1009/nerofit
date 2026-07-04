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

// Best-guess meal slot from the time of day.
export function defaultSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}
