import { supabase } from "@/lib/supabase";
import type {
  Exercise,
  Program,
  ProgramDay,
  ProgramDayExercise,
  ProgramDayTask,
  ProgramDayTest,
} from "@/types/db";

// Programs that have a day-based curriculum (the new Workout track). Old
// catalog programs (no program_days) are excluded.
export async function listCurriculumPrograms(): Promise<Program[]> {
  const { data: dayRows, error: dayErr } = await supabase
    .from("program_days")
    .select("program_id");
  if (dayErr) throw dayErr;
  const ids = [...new Set((dayRows ?? []).map((d) => d.program_id))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .in("id", ids)
    .order("phase");
  if (error) throw error;
  return data ?? [];
}

export async function listProgramDays(programId: string): Promise<ProgramDay[]> {
  const { data, error } = await supabase
    .from("program_days")
    .select("*")
    .eq("program_id", programId)
    .order("week_no")
    .order("day_no");
  if (error) throw error;
  return data ?? [];
}

export type DayExerciseWithExercise = ProgramDayExercise & { exercise: Exercise };

export type ProgramDayDetail = {
  day: ProgramDay;
  exercises: DayExerciseWithExercise[];
  tasks: ProgramDayTask[];
  tests: ProgramDayTest[];
};

export async function getProgramDayDetail(
  dayId: string,
): Promise<ProgramDayDetail> {
  const [dayRes, exRes, taskRes, testRes] = await Promise.all([
    supabase.from("program_days").select("*").eq("id", dayId).single(),
    supabase
      .from("program_day_exercises")
      .select("*, exercise:exercises(*)")
      .eq("program_day_id", dayId)
      .order("order_index"),
    supabase
      .from("program_day_tasks")
      .select("*")
      .eq("program_day_id", dayId)
      .order("order_index"),
    supabase
      .from("program_day_tests")
      .select("*")
      .eq("program_day_id", dayId)
      .order("order_index"),
  ]);
  if (dayRes.error) throw dayRes.error;
  if (exRes.error) throw exRes.error;
  if (taskRes.error) throw taskRes.error;
  if (testRes.error) throw testRes.error;
  return {
    day: dayRes.data as ProgramDay,
    exercises: (exRes.data ?? []) as unknown as DayExerciseWithExercise[],
    tasks: (taskRes.data ?? []) as ProgramDayTask[],
    tests: (testRes.data ?? []) as ProgramDayTest[],
  };
}
