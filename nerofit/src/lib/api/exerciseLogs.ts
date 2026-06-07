import { supabase } from "@/lib/supabase";
import type { ExerciseLog, LogStatus } from "@/types/db";

export type LogExerciseInput = {
  sessionId: string;
  exerciseId: string;
  status: LogStatus;
  setsDone?: number | null;
  repsDone?: number | null;
  weightUsed?: number | null;
};

// One log row per (session, exercise). Re-logging overwrites (e.g. undo skip).
export async function logExercise(input: LogExerciseInput): Promise<ExerciseLog> {
  const { data, error } = await supabase
    .from("exercise_logs")
    .upsert(
      {
        session_id: input.sessionId,
        exercise_id: input.exerciseId,
        status: input.status,
        sets_done: input.setsDone ?? null,
        reps_done: input.repsDone ?? null,
        weight_used: input.weightUsed ?? null,
        logged_at: new Date().toISOString(),
      },
      { onConflict: "session_id,exercise_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
