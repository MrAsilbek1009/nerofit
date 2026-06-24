import { supabase } from "@/lib/supabase";

// Task ids the user has completed within a given day session.
export async function listSessionTaskCompletions(
  daySessionId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("task_completions")
    .select("program_day_task_id")
    .eq("day_session_id", daySessionId);
  if (error) throw error;
  return (data ?? []).map((r) => r.program_day_task_id);
}

export async function setTaskCompletion(
  daySessionId: string,
  programDayTaskId: string,
  done: boolean,
): Promise<void> {
  if (done) {
    const { error } = await supabase.from("task_completions").upsert(
      { day_session_id: daySessionId, program_day_task_id: programDayTaskId },
      { onConflict: "day_session_id,program_day_task_id" },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("task_completions")
      .delete()
      .eq("day_session_id", daySessionId)
      .eq("program_day_task_id", programDayTaskId);
    if (error) throw error;
  }
}

// Total XP = sum of reward_xp across every task the user has completed.
// RLS scopes task_completions to the current user.
export async function getXpTotal(): Promise<number> {
  const { data, error } = await supabase
    .from("task_completions")
    .select("program_day_tasks(reward_xp)");
  if (error) throw error;
  const rows =
    (data as unknown as {
      program_day_tasks: { reward_xp: number | null } | null;
    }[]) ?? [];
  return rows.reduce((sum, r) => sum + (r.program_day_tasks?.reward_xp ?? 0), 0);
}
