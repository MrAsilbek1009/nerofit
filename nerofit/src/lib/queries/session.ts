import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeSession,
  getOrCreateActiveSession,
  type SessionWithLogs,
} from "@/lib/api/sessions";
import { logExercise, type LogExerciseInput } from "@/lib/api/exerciseLogs";
import { track } from "@/lib/analytics";
import { qk } from "./keys";

// Active session for a workout (auto-created). Holds the exercise_logs so the
// details screen can render done / skipped / pending per exercise.
export function useActiveSession(
  userId: string | undefined,
  workoutId: string | undefined,
) {
  return useQuery({
    queryKey:
      userId && workoutId
        ? qk.activeSession(userId, workoutId)
        : ["active-session", "none"],
    queryFn: () => getOrCreateActiveSession(userId!, workoutId!),
    enabled: !!userId && !!workoutId,
  });
}

export function useLogExercise(
  userId: string | undefined,
  workoutId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogExerciseInput) => logExercise(input),
    onSuccess: (_data, input) => {
      track("exercise_logged", {
        exercise_id: input.exerciseId,
        status: input.status,
      });
      if (userId && workoutId) {
        void qc.invalidateQueries({
          queryKey: qk.activeSession(userId, workoutId),
        });
      }
    },
  });
}

export function useCompleteSession(
  userId: string | undefined,
  workoutId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => completeSession(sessionId),
    onSuccess: () => {
      if (workoutId) track("workout_completed", { workout_id: workoutId });
      if (userId && workoutId) {
        void qc.invalidateQueries({
          queryKey: qk.activeSession(userId, workoutId),
        });
      }
    },
  });
}

export type { SessionWithLogs };
