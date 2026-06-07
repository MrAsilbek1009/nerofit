import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGoals, upsertGoals } from "@/lib/api/goals";
import { qk } from "./keys";
import type { Database } from "@/types/db";

type GoalsInsert = Database["public"]["Tables"]["goals"]["Insert"];

export function useGoals(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? qk.goals(userId) : ["goals", "anon"],
    queryFn: () => getGoals(userId!),
    enabled: !!userId,
  });
}

export function useUpsertGoals(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<GoalsInsert, "user_id">) => {
      if (!userId) throw new Error("Not authenticated");
      return upsertGoals({ ...input, user_id: userId });
    },
    onSuccess: (goals) => {
      if (userId) qc.setQueryData(qk.goals(userId), goals);
    },
  });
}
