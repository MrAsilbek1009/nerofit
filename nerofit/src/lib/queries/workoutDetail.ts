import { useQuery } from "@tanstack/react-query";
import { getWorkoutDetail } from "@/lib/api/workouts";
import { qk } from "./keys";

export function useWorkoutDetail(workoutId: string | undefined) {
  return useQuery({
    queryKey: workoutId ? qk.workoutDetail(workoutId) : ["workout-detail", "none"],
    queryFn: () => getWorkoutDetail(workoutId!),
    enabled: !!workoutId,
  });
}
