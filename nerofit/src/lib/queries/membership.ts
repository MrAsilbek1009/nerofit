import { useQuery } from "@tanstack/react-query";
import {
  getActiveMembership,
  getMembershipPlans,
  getPayments,
} from "@/lib/api/membership";

export function useMembershipPlans() {
  return useQuery({
    queryKey: ["membership-plans"],
    queryFn: getMembershipPlans,
    staleTime: 1000 * 60 * 10,
  });
}

export function useActiveMembership(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ["membership", userId] : ["membership", "none"],
    queryFn: () => getActiveMembership(userId!),
    enabled: !!userId,
  });
}

export function usePayments(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ["payments", userId] : ["payments", "none"],
    queryFn: () => getPayments(userId!),
    enabled: !!userId,
  });
}

// A membership is "active" when status=active and it hasn't expired yet.
export function isMembershipActive(
  m: { status: string; end_date: string | null } | null | undefined,
): boolean {
  if (!m || m.status !== "active" || !m.end_date) return false;
  return new Date(m.end_date) >= new Date(new Date().toDateString());
}
