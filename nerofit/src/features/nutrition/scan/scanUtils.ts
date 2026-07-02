import type { FoodScanMacros } from "@/lib/api/foodScan";
import type { MealSlot } from "@/types/db";

// Shared helpers for the food-scan flow (photo / barcode / search).

export const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

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
