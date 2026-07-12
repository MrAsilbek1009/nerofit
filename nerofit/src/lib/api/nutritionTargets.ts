import { supabase } from "@/lib/supabase";

// Adaptive nutrition targets (0021 migration): the weekly audit trail of the
// MacroFactor-style goal engine — each row records the kcal/macro target set
// on a given date plus the estimated TDEE and weight trend that produced it.
// profiles.*_goal_g remain the LIVE values the UI reads; this table is only
// history. Not in the generated db.ts yet, so — like userFoods — we query by
// string and cast the row shape.

export type NutritionTarget = {
  id: string;
  effective_date: string; // YYYY-MM-DD
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  tdee_kcal: number;
  weight_trend_weekly_kg: number | null;
  reason: string;
  created_at: string;
};

export type NutritionTargetInput = {
  effective_date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  tdee_kcal: number;
  weight_trend_weekly_kg: number | null;
  reason?: string; // default 'adaptive'
};

const TARGET_FIELDS =
  "id, effective_date, kcal, protein_g, carbs_g, fats_g, tdee_kcal, weight_trend_weekly_kg, reason, created_at";

export async function getLatestNutritionTarget(
  userId: string,
): Promise<NutritionTarget | null> {
  const { data, error } = await supabase
    .from("nutrition_targets")
    .select(TARGET_FIELDS)
    .eq("user_id", userId)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as NutritionTarget | null) ?? null;
}

// Upsert on (user_id, effective_date): recomputing on the same day replaces
// that day's row instead of failing the unique constraint.
export async function upsertNutritionTarget(
  userId: string,
  input: NutritionTargetInput,
): Promise<void> {
  const { error } = await supabase.from("nutrition_targets").upsert(
    {
      user_id: userId,
      effective_date: input.effective_date,
      kcal: input.kcal,
      protein_g: input.protein_g,
      carbs_g: input.carbs_g,
      fats_g: input.fats_g,
      tdee_kcal: input.tdee_kcal,
      weight_trend_weekly_kg: input.weight_trend_weekly_kg,
      reason: input.reason ?? "adaptive",
    } as never,
    { onConflict: "user_id,effective_date" },
  );
  if (error) throw error;
}

// Newest-first target history (default ~6 months of weekly rows) for a
// future history screen.
export async function listNutritionTargets(
  userId: string,
  limit = 26,
): Promise<NutritionTarget[]> {
  const { data, error } = await supabase
    .from("nutrition_targets")
    .select(TARGET_FIELDS)
    .eq("user_id", userId)
    .order("effective_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NutritionTarget[];
}
