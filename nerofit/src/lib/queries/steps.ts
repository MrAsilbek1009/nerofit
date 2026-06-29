import { useQuery } from "@tanstack/react-query";
import { getTodaySteps } from "@/lib/pedometer";

// Today's steps from the device pedometer. Returns null when unavailable
// (no permission / simulator / Android / Expo Go).
export function useStepsToday() {
  return useQuery({
    queryKey: ["steps-today"],
    queryFn: getTodaySteps,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
