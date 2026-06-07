import { supabase } from "@/lib/supabase";
import type {
  Exercise,
  ExerciseVideo,
  ProgramLevel,
  Workout,
  WorkoutExercise,
} from "@/types/db";

export type WorkoutExerciseDetail = WorkoutExercise & {
  exercise: Exercise & { exercise_videos: ExerciseVideo[] };
};

export type WorkoutDetail = Workout & {
  program: { title: string; level: ProgramLevel } | null;
  workout_exercises: WorkoutExerciseDetail[];
};

export async function getWorkoutDetail(workoutId: string): Promise<WorkoutDetail> {
  const { data, error } = await supabase
    .from("workouts")
    .select(
      "*, program:programs(title, level), workout_exercises(*, exercise:exercises(*, exercise_videos(*)))",
    )
    .eq("id", workoutId)
    .order("order_index", { referencedTable: "workout_exercises", ascending: true })
    .single();
  if (error) throw error;
  return data as unknown as WorkoutDetail;
}
