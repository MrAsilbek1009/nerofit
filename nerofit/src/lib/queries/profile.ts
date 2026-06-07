import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/lib/api/profiles";
import { qk } from "./keys";
import type { Database } from "@/types/db";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? qk.profile(userId) : ["profile", "anon"],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });
}

export function useUpdateProfile(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => {
      if (!userId) throw new Error("Not authenticated");
      return updateProfile(userId, patch);
    },
    onSuccess: (profile) => {
      if (userId) qc.setQueryData(qk.profile(userId), profile);
    },
  });
}
