import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeDaySession,
  getOrCreateDaySession,
  logDayExercise,
  type LogDayExerciseInput,
} from "@/lib/api/curriculumSession";
import { qk } from "./keys";

export function useDaySession(
  userId: string | undefined,
  programDayId: string | undefined,
) {
  return useQuery({
    queryKey:
      userId && programDayId
        ? qk.daySession(userId, programDayId)
        : ["day-session", "none"],
    queryFn: () => getOrCreateDaySession(userId!, programDayId!),
    enabled: !!userId && !!programDayId,
  });
}

export function useLogDayExercise(
  userId: string | undefined,
  programDayId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LogDayExerciseInput) => logDayExercise(input),
    onSuccess: () => {
      if (userId && programDayId) {
        void qc.invalidateQueries({
          queryKey: qk.daySession(userId, programDayId),
        });
      }
    },
  });
}

export function useCompleteDaySession() {
  return useMutation({
    mutationFn: (sessionId: string) => completeDaySession(sessionId),
  });
}
