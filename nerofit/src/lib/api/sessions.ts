import { supabase } from "@/lib/supabase";
import type { ExerciseLog, WorkoutSession } from "@/types/db";

export type SessionWithLogs = WorkoutSession & { exercise_logs: ExerciseLog[] };

// Returns the user's active session for a workout, creating one if none exists.
export async function getOrCreateActiveSession(
  userId: string,
  workoutId: string,
): Promise<SessionWithLogs> {
  const selectActive = () =>
    supabase
      .from("workout_sessions")
      .select("*, exercise_logs(*)")
      .eq("user_id", userId)
      .eq("workout_id", workoutId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  const { data: existing, error: selErr } = await selectActive();
  if (selErr) throw selErr;
  if (existing) return existing as SessionWithLogs;

  const { data: created, error: insErr } = await supabase
    .from("workout_sessions")
    .insert({ user_id: userId, workout_id: workoutId })
    .select("*, exercise_logs(*)")
    .single();
  if (insErr) {
    // Race: boshqa mount unique index tufayli active sessiyani avval yaratdi.
    if (insErr.code === "23505") {
      const { data: raced, error: raceErr } = await selectActive();
      if (raceErr) throw raceErr;
      if (raced) return raced as SessionWithLogs;
    }
    throw insErr;
  }
  return created as SessionWithLogs;
}

export async function completeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("workout_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}
