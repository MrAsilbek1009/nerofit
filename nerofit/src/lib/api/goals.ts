import { supabase } from "@/lib/supabase";
import type { Database, Goals } from "@/types/db";

type GoalsInsert = Database["public"]["Tables"]["goals"]["Insert"];

export async function getGoals(userId: string): Promise<Goals | null> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertGoals(input: GoalsInsert): Promise<Goals> {
  const { data, error } = await supabase
    .from("goals")
    .upsert(input, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
