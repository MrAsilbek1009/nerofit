import { useQuery } from "@tanstack/react-query";
import {
  getLatestHealthMetric,
  getRecentHealthMetrics,
} from "@/lib/api/healthMetrics";
import { qk } from "./keys";
import type { HealthMetricType } from "@/types/db";

export function useLatestHealthMetric(
  userId: string | undefined,
  type: HealthMetricType,
) {
  return useQuery({
    queryKey: userId
      ? qk.latestHealthMetric(userId, type)
      : ["health-metrics", "latest", "anon", type],
    queryFn: () => getLatestHealthMetric(userId!, type),
    enabled: !!userId,
  });
}

export function useRecentHealthMetrics(
  userId: string | undefined,
  type: HealthMetricType,
) {
  return useQuery({
    queryKey: userId
      ? qk.recentHealthMetrics(userId, type)
      : ["health-metrics", "recent", "anon", type],
    queryFn: () => getRecentHealthMetrics(userId!, type),
    enabled: !!userId,
  });
}
