import { supabase } from "@/lib/supabase";

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getTodayWaterTotal(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("water_logs")
    .select("amount_ml")
    .eq("user_id", userId)
    .gte("logged_at", startOfTodayIso());
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + (row.amount_ml ?? 0), 0);
}

export async function addWaterLog(
  userId: string,
  amountMl: number,
): Promise<void> {
  const { error } = await supabase
    .from("water_logs")
    .insert({ user_id: userId, amount_ml: amountMl });
  if (error) throw error;
}
