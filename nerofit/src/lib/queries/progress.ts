import { useQuery } from "@tanstack/react-query";
import {
  getCompletedWorkoutCount,
  getTotalVolume,
  listCompletedSessions,
  listWeightSeries,
} from "@/lib/api/progress";
import { startOfWeek } from "@/features/progress/streak";
import { qk } from "./keys";

export type ProgressPeriod = "week" | "month" | "year";

function periodSinceIso(period: ProgressPeriod): string {
  const d = new Date();
  if (period === "week") d.setDate(d.getDate() - 7);
  else if (period === "month") d.setMonth(d.getMonth() - 1);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
}

export function useWeightSeries(
  userId: string | undefined,
  period: ProgressPeriod,
) {
  return useQuery({
    queryKey: userId ? qk.weightSeries(userId, period) : ["weight-series", "none"],
    queryFn: () => listWeightSeries(userId!, periodSinceIso(period)),
    enabled: !!userId,
  });
}

// Completed sessions in the current week (for the weekly-activity row + streak).
export function useWeekSessions(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? qk.weekSessions(userId) : ["week-sessions", "none"],
    queryFn: () => listCompletedSessions(userId!, startOfWeek().toISOString()),
    enabled: !!userId,
  });
}

export function useWorkoutStats(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? qk.workoutStats(userId) : ["workout-stats", "none"],
    queryFn: async () => {
      const [count, volume] = await Promise.all([
        getCompletedWorkoutCount(userId!),
        getTotalVolume(userId!),
      ]);
      return { count, volume };
    },
    enabled: !!userId,
  });
}

// Streak needs a wider window than the current week.
export function useStreakSessions(userId: string | undefined) {
  return useQuery({
    queryKey: userId
      ? ["streak-sessions", userId]
      : ["streak-sessions", "none"],
    queryFn: () => {
      const since = new Date();
      since.setDate(since.getDate() - 120);
      return listCompletedSessions(userId!, since.toISOString());
    },
    enabled: !!userId,
  });
}
