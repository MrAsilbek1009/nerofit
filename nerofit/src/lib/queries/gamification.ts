import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getXpTotal,
  listSessionTaskCompletions,
  setTaskCompletion,
} from "@/lib/api/gamification";
import { qk } from "./keys";

export function useSessionTaskCompletions(daySessionId: string | undefined) {
  return useQuery({
    queryKey: daySessionId
      ? qk.sessionTaskCompletions(daySessionId)
      : ["task-completions", "none"],
    queryFn: () => listSessionTaskCompletions(daySessionId!),
    enabled: !!daySessionId,
  });
}

export function useToggleTaskCompletion(
  userId: string | undefined,
  daySessionId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, done }: { taskId: string; done: boolean }) => {
      if (!daySessionId) throw new Error("No active session");
      return setTaskCompletion(daySessionId, taskId, done);
    },
    onSuccess: () => {
      if (daySessionId) {
        void qc.invalidateQueries({
          queryKey: qk.sessionTaskCompletions(daySessionId),
        });
      }
      if (userId) void qc.invalidateQueries({ queryKey: qk.xpTotal(userId) });
    },
  });
}

export function useXpTotal(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? qk.xpTotal(userId) : ["xp-total", "none"],
    queryFn: getXpTotal,
    enabled: !!userId,
  });
}
