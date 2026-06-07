import { supabase } from "@/lib/supabase";
import type { Program, Workout } from "@/types/db";

export type ProgramWithWorkouts = Program & { workouts: Workout[] };

export async function listPrograms(): Promise<ProgramWithWorkouts[]> {
  const { data, error } = await supabase
    .from("programs")
    .select("*, workouts(*)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProgramWithWorkouts[];
}
