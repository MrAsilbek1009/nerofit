import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addBodyMetric, getLatestBodyMetric } from "@/lib/api/bodyMetrics";
import { qk } from "./keys";
import type { Database } from "@/types/db";

type BodyMetricInsert = Database["public"]["Tables"]["body_metrics"]["Insert"];

export function useLatestBodyMetric(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? qk.latestBodyMetric(userId) : ["body-metrics", "anon"],
    queryFn: () => getLatestBodyMetric(userId!),
    enabled: !!userId,
  });
}

export function useAddBodyMetric(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<BodyMetricInsert, "user_id">) => {
      if (!userId) throw new Error("Not authenticated");
      return addBodyMetric({ ...input, user_id: userId });
    },
    onSuccess: () => {
      if (userId)
        void qc.invalidateQueries({ queryKey: qk.latestBodyMetric(userId) });
    },
  });
}
