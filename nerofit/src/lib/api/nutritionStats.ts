import { supabase } from "@/lib/supabase";

// Lifetime counters behind the nutrition badges (Phase 16 N4.1). Head-only
// count queries — no rows transferred; RLS scopes everything to the caller.
export type NutritionStats = {
  totalLogs: number;
  totalScans: number;
  foodsSubmitted: number;
};

async function countRows(
  table: string,
  column: string,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, userId);
  if (error) throw error;
  return count ?? 0;
}

export async function getNutritionStats(userId: string): Promise<NutritionStats> {
  const [totalLogs, totalScans, foodsSubmitted] = await Promise.all([
    countRows("meal_logs", "user_id", userId),
    countRows("food_scans", "user_id", userId),
    countRows("foods", "created_by", userId),
  ]);
  return { totalLogs, totalScans, foodsSubmitted };
}
