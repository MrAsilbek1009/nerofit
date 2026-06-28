import { supabase } from "@/lib/supabase";
import type {
  CustomSession,
  CustomSessionExercise,
  GeneratorParams,
  LogStatus,
  ProgramSection,
} from "@/types/db";
import type { LibraryExercise } from "./exercises";

export type CustomExerciseWithExercise = CustomSessionExercise & {
  exercise: LibraryExercise;
};

export type CustomSessionWithExercises = CustomSession & {
  custom_session_exercises: CustomExerciseWithExercise[];
};

export type NewCustomExercise = {
  exercise_id: string;
  section: ProgramSection;
  order_index: number;
  reps: string | null;
  sets: number | null;
  rest_sec: number | null;
};

// Persist a generated workout (called when the user taps "Start Workout").
export async function createCustomSession(
  userId: string,
  input: { title: string; params: GeneratorParams; exercises: NewCustomExercise[] },
): Promise<string> {
  const { data: session, error } = await supabase
    .from("custom_sessions")
    .insert({ user_id: userId, title: input.title, params: input.params })
    .select("id")
    .single();
  if (error) throw error;

  if (input.exercises.length > 0) {
    const rows = input.exercises.map((e) => ({ ...e, custom_session_id: session.id }));
    const { error: exErr } = await supabase.from("custom_session_exercises").insert(rows);
    if (exErr) throw exErr;
  }
  return session.id;
}

export async function getCustomSession(id: string): Promise<CustomSessionWithExercises> {
  const { data, error } = await supabase
    .from("custom_sessions")
    .select("*, custom_session_exercises(*, exercise:exercises(*, exercise_videos(*)))")
    .eq("id", id)
    .single();
  if (error) throw error;
  const session = data as unknown as CustomSessionWithExercises;
  session.custom_session_exercises.sort((a, b) => a.order_index - b.order_index);
  return session;
}

export type LogCustomExerciseInput = {
  id: string; // custom_session_exercises.id
  status: LogStatus;
  setsDone?: number | null;
  repsDone?: number | null;
  weightUsed?: number | null;
};

export async function logCustomExercise(input: LogCustomExerciseInput): Promise<void> {
  const { error } = await supabase
    .from("custom_session_exercises")
    .update({
      status: input.status,
      sets_done: input.setsDone ?? null,
      reps_done: input.repsDone ?? null,
      weight_used: input.weightUsed ?? null,
      logged_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw error;
}

export async function completeCustomSession(id: string): Promise<void> {
  const { error } = await supabase
    .from("custom_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Completed custom sessions, newest first — for the separate custom progression.
export async function listCompletedCustomSessions(userId: string): Promise<CustomSession[]> {
  const { data, error } = await supabase
    .from("custom_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
