import { useMutation } from "@tanstack/react-query";
import { deleteAccount } from "@/lib/api/account";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth";
import { track } from "@/lib/analytics";

// Permanently delete the account, then tear down all local state so the auth
// gate drops the user back to login. The server-side user is already gone, so
// sign out locally only (a network sign-out would 401 on a deleted user).
export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      track("account_deleted");
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      queryClient.clear();
      useAuthStore.getState().setSession(null);
    },
  });
}
