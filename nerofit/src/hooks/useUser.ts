import { useAuthStore } from "@/store/auth";

// Convenience: pull the user id off the session in one call.
export function useUserId(): string | undefined {
  return useAuthStore((s) => s.session?.user.id);
}
