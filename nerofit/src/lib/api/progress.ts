import { supabase } from "@/lib/supabase";

export type WeightPoint = { recorded_at: string; weight_kg: number };

export async function listWeightSeries(
  userId: string,
  sinceIso: string,
): Promise<WeightPoint[]> {
  const { data, error } = await supabase
    .from("body_metrics")
    .select("recorded_at, weight_kg")
    .eq("user_id", userId)
    .gte("recorded_at", sinceIso)
    .not("weight_kg", "is", null)
    .order("recorded_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    recorded_at: r.recorded_at,
    weight_kg: Number(r.weight_kg),
  }));
}

// Completed sessions since a date (for weekly activity + streak).
export async function listCompletedSessions(
  userId: string,
  sinceIso: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("completed_at", sinceIso)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((r) => r.completed_at)
    .filter((v): v is string => !!v);
}

export async function getCompletedWorkoutCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");
  if (error) throw error;
  return count ?? 0;
}

// Total lifted volume = Σ sets_done × reps_done × weight_used (RLS scopes to user).
export async function getTotalVolume(userId: string): Promise<number> {
  void userId; // RLS already restricts exercise_logs to the caller
  const { data, error } = await supabase
    .from("exercise_logs")
    .select("sets_done, reps_done, weight_used");
  if (error) throw error;
  let total = 0;
  for (const row of data ?? []) {
    if (row.sets_done && row.reps_done && row.weight_used) {
      total += row.sets_done * row.reps_done * Number(row.weight_used);
    }
  }
  return Math.round(total);
}
