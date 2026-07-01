import { useQuery } from "@tanstack/react-query";
import { getTodayActiveEnergy, getTodaySteps } from "@/lib/health";

export type TodayActivity = {
  // null when no source is available (Android/simulator/Expo Go).
  steps: number | null;
  // Real active energy (kcal) from HealthKit, or null → caller estimates.
  activeEnergy: number | null;
};

// Today's steps + active energy, preferring HealthKit and falling back to the
// pedometer (see src/lib/health.ts).
export function useActivityToday() {
  return useQuery<TodayActivity>({
    queryKey: ["activity-today"],
    queryFn: async () => {
      const [steps, activeEnergy] = await Promise.all([
        getTodaySteps(),
        getTodayActiveEnergy(),
      ]);
      return { steps, activeEnergy };
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
