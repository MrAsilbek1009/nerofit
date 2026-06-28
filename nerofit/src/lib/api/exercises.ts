import { supabase } from "@/lib/supabase";
import type { Exercise, ExerciseVideo } from "@/types/db";

export type LibraryExercise = Exercise & { exercise_videos: ExerciseVideo[] };

// The full exercise catalog (read-only) used by the custom workout generator.
export async function listLibraryExercises(): Promise<LibraryExercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*, exercise_videos(*)");
  if (error) throw error;
  return (data ?? []) as unknown as LibraryExercise[];
}
