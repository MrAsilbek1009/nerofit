import { supabase } from "@/lib/supabase";
import type { HealthMetric, HealthMetricType } from "@/types/db";

export async function getLatestHealthMetric(
  userId: string,
  type: HealthMetricType,
): Promise<HealthMetric | null> {
  const { data, error } = await supabase
    .from("health_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRecentHealthMetrics(
  userId: string,
  type: HealthMetricType,
  limit = 12,
): Promise<HealthMetric[]> {
  const { data, error } = await supabase
    .from("health_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
