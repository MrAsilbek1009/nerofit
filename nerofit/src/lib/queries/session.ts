import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeSession,
  getOrCreateActiveSession,
  type SessionWithLogs,
} from "@/lib/api/sessions";
import { logExercise, type LogExerciseInput } from "@/lib/api/exerciseLogs";
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
    onSuccess: () => {
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
      if (userId && workoutId) {
        void qc.invalidateQueries({
          queryKey: qk.activeSession(userId, workoutId),
        });
      }
    },
  });
}

export type { SessionWithLogs };
