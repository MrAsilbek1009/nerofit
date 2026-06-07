import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addWaterLog, getTodayWaterTotal } from "@/lib/api/waterLogs";
import { qk } from "./keys";

export function useTodayWaterTotal(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? qk.todayWaterTotal(userId) : ["water-logs", "anon"],
    queryFn: () => getTodayWaterTotal(userId!),
    enabled: !!userId,
  });
}

export function useAddWaterLog(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amountMl: number) => {
      if (!userId) throw new Error("Not authenticated");
      return addWaterLog(userId, amountMl);
    },
    onSuccess: () => {
      if (userId)
        void qc.invalidateQueries({ queryKey: qk.todayWaterTotal(userId) });
    },
  });
}
