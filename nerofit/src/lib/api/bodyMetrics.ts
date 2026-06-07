import { supabase } from "@/lib/supabase";
import type { BodyMetric, Database } from "@/types/db";

type BodyMetricInsert = Database["public"]["Tables"]["body_metrics"]["Insert"];

export async function getLatestBodyMetric(
  userId: string,
): Promise<BodyMetric | null> {
  const { data, error } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addBodyMetric(
  input: BodyMetricInsert,
): Promise<BodyMetric> {
  const { data, error } = await supabase
    .from("body_metrics")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
