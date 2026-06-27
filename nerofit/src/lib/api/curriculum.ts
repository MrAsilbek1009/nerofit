import { supabase } from "@/lib/supabase";
import {
  allowedEquipmentTiers,
  hasAnyInjury,
  isSafe,
  pickReplacement,
  requiredSafety,
  type SafetyFlags,
} from "@/features/workouts/injuryFilter";
import type {
  Exercise,
  ExerciseVideo,
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

// program_day_ids of this user's completed day-sessions. The Program overview
// only renders one program's days, so cross-program ids are harmless extras.
export async function listCompletedDayIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("day_sessions")
    .select("program_day_id")
    .eq("user_id", userId)
    .eq("status", "completed");
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.program_day_id))];
}

export type DayExerciseWithExercise = ProgramDayExercise & {
  exercise: Exercise & { exercise_videos: ExerciseVideo[] };
  // True when this exercise was swapped in to avoid an injured area.
  adapted?: boolean;
};

export type ProgramDayDetail = {
  day: ProgramDay;
  exercises: DayExerciseWithExercise[];
  tasks: ProgramDayTask[];
  tests: ProgramDayTest[];
};

export async function getProgramDayDetail(
  dayId: string,
  injuries: string[] = [],
  equipment?: string,
): Promise<ProgramDayDetail> {
  const [dayRes, exRes, taskRes, testRes] = await Promise.all([
    supabase.from("program_days").select("*").eq("id", dayId).single(),
    supabase
      .from("program_day_exercises")
      .select("*, exercise:exercises(*, exercise_videos(*))")
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

  let exercises = (exRes.data ?? []) as unknown as DayExerciseWithExercise[];
  const req = requiredSafety(injuries);
  if (hasAnyInjury(req)) {
    exercises = await substituteUnsafe(
      exercises,
      req,
      allowedEquipmentTiers(equipment),
    );
  }

  return {
    day: dayRes.data as ProgramDay,
    exercises,
    tasks: (taskRes.data ?? []) as ProgramDayTask[],
    tests: (testRes.data ?? []) as ProgramDayTest[],
  };
}

// Swap exercises that aren't safe for the user's injuries with a safe
// alternative from the same progression_group; drop those with no alternative.
async function substituteUnsafe(
  exercises: DayExerciseWithExercise[],
  req: SafetyFlags,
  allowedTiers: string[],
): Promise<DayExerciseWithExercise[]> {
  const unsafe = exercises.filter((e) => e.exercise && !isSafe(e.exercise, req));
  if (unsafe.length === 0) return exercises;

  const groups = [
    ...new Set(
      unsafe.map((e) => e.exercise.progression_group).filter(Boolean),
    ),
  ] as string[];

  type CandidateExercise = Exercise & { exercise_videos: ExerciseVideo[] };
  let candidates: CandidateExercise[] = [];
  if (groups.length > 0) {
    const { data, error } = await supabase
      .from("exercises")
      .select("*, exercise_videos(*)")
      .in("progression_group", groups);
    if (error) throw error;
    candidates = (data ?? []) as unknown as CandidateExercise[];
  }

  return exercises.flatMap((e) => {
    if (!e.exercise || isSafe(e.exercise, req)) return [e];
    const group = e.exercise.progression_group;
    const replacement = group
      ? pickReplacement(
          e.exercise,
          candidates.filter((c) => c.progression_group === group),
          req,
          allowedTiers,
        )
      : null;
    return replacement ? [{ ...e, exercise: replacement, adapted: true }] : [];
  });
}
