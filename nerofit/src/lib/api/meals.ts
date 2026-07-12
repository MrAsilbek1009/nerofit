import { supabase } from "@/lib/supabase";
import type { Meal, MealLog, MealSlot } from "@/types/db";

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function todayDate(): string {
  return localDate(new Date());
}

export async function listMeals(): Promise<Meal[]> {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listTodayMealLogs(userId: string): Promise<MealLog[]> {
  const { data, error } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", todayDate())
    .order("logged_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function logMeal(
  userId: string,
  meal: Meal,
  slot: MealSlot,
): Promise<MealLog> {
  // Copy micros only when the catalog meal carries them. Reading an absent
  // column yields undefined, so this is a no-op before the 0011 migration is
  // applied — and the insert never references a column that doesn't exist yet.
  const micros: Partial<Pick<MealLog, "fiber_g" | "sugar_g" | "sodium_mg">> = {};
  if (meal.fiber_g != null) micros.fiber_g = meal.fiber_g;
  if (meal.sugar_g != null) micros.sugar_g = meal.sugar_g;
  if (meal.sodium_mg != null) micros.sodium_mg = meal.sodium_mg;

  const { data, error } = await supabase
    .from("meal_logs")
    .insert({
      user_id: userId,
      meal_id: meal.id,
      slot,
      name: meal.name,
      kcal: meal.kcal,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fats_g: meal.fats_g,
      ...micros,
      source: "catalog",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Log a scanned / manually-edited meal. Unlike `logMeal` there is no catalog
 * row, so every value is denormalized onto `meal_logs` and `source` is `scan`.
 */
export async function logScannedMeal(
  userId: string,
  entry: {
    name: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    slot: MealSlot;
  },
): Promise<MealLog> {
  const { data, error } = await supabase
    .from("meal_logs")
    .insert({
      user_id: userId,
      meal_id: null,
      slot: entry.slot,
      name: entry.name,
      kcal: entry.kcal,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fats_g: entry.fats_g,
      source: "scan",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Recent logs across the last `days` days (newest first) — the raw feed for
// the fast-log "Recents" list (deduped client-side by recentFoodsFromLogs).
export async function listRecentMealLogs(
  userId: string,
  days = 14,
  limit = 100,
): Promise<MealLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", localDate(since))
    .order("logged_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/**
 * Log a manual fast-log entry (recents / favorites / saved meals). Same
 * denormalized shape as `logScannedMeal`, but `source` is `manual`.
 */
export async function logManualMeal(
  userId: string,
  entry: {
    name: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    slot: MealSlot;
  },
): Promise<MealLog> {
  const { data, error } = await supabase
    .from("meal_logs")
    .insert({
      user_id: userId,
      meal_id: null,
      slot: entry.slot,
      name: entry.name,
      kcal: entry.kcal,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fats_g: entry.fats_g,
      source: "manual",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMealLog(id: string): Promise<void> {
  const { error } = await supabase.from("meal_logs").delete().eq("id", id);
  if (error) throw error;
}
