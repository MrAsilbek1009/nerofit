import { supabase } from "@/lib/supabase";
import type { DayExerciseLog, DaySession, LogStatus } from "@/types/db";

export type DaySessionWithLogs = DaySession & {
  day_exercise_logs: DayExerciseLog[];
};

// Active session for a program day, created on first open.
export async function getOrCreateDaySession(
  userId: string,
  programDayId: string,
): Promise<DaySessionWithLogs> {
  const selectActive = () =>
    supabase
      .from("day_sessions")
      .select("*, day_exercise_logs(*)")
      .eq("user_id", userId)
      .eq("program_day_id", programDayId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  const { data: existing, error } = await selectActive();
  if (error) throw error;
  if (existing) return existing as DaySessionWithLogs;

  const { data: created, error: insErr } = await supabase
    .from("day_sessions")
    .insert({ user_id: userId, program_day_id: programDayId })
    .select("*, day_exercise_logs(*)")
    .single();
  if (insErr) throw insErr;
  return created as DaySessionWithLogs;
}

export type LogDayExerciseInput = {
  daySessionId: string;
  programDayExerciseId: string;
  status: LogStatus;
  setsDone?: number | null;
  repsDone?: number | null;
  weightUsed?: number | null;
};

// One log row per (session, program_day_exercise). Re-logging overwrites.
export async function logDayExercise(
  input: LogDayExerciseInput,
): Promise<DayExerciseLog> {
  const { data, error } = await supabase
    .from("day_exercise_logs")
    .upsert(
      {
        day_session_id: input.daySessionId,
        program_day_exercise_id: input.programDayExerciseId,
        status: input.status,
        sets_done: input.setsDone ?? null,
        reps_done: input.repsDone ?? null,
        weight_used: input.weightUsed ?? null,
        logged_at: new Date().toISOString(),
      },
      { onConflict: "day_session_id,program_day_exercise_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function completeDaySession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("day_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}
