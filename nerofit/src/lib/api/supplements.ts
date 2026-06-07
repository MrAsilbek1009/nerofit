import { supabase } from "@/lib/supabase";
import type { Supplement, SupplementLog } from "@/types/db";

function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function listSupplements(): Promise<Supplement[]> {
  const { data, error } = await supabase
    .from("supplements")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listTodaySupplementLogs(
  userId: string,
): Promise<SupplementLog[]> {
  const { data, error } = await supabase
    .from("supplement_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", todayDate());
  if (error) throw error;
  return data ?? [];
}

// Toggle today's taken-state for a supplement.
export async function setSupplementTaken(
  userId: string,
  supplementId: string,
  taken: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("supplement_logs")
    .upsert(
      {
        user_id: userId,
        supplement_id: supplementId,
        log_date: todayDate(),
        taken,
      },
      { onConflict: "user_id,supplement_id,log_date" },
    );
  if (error) throw error;
}
