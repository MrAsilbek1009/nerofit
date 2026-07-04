import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getActiveMembership,
  getMembershipPlans,
  getPayments,
  startCheckout,
  type PaymentProvider,
} from "@/lib/api/membership";
import { track } from "@/lib/analytics";

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

// Start Payme/Click checkout for a plan. Returns the provider checkout URL for
// the caller to open; the membership activates via the webhook once paid, and
// the screen refetches on focus.
export function useStartCheckout() {
  return useMutation({
    mutationFn: ({ planId, provider }: { planId: string; provider: PaymentProvider }) =>
      startCheckout(planId, provider),
    onSuccess: (_data, { provider }) => {
      track("membership_checkout_started", { provider });
    },
  });
}

// A membership is "active" when status=active and it hasn't expired yet.
export function isMembershipActive(
  m: { status: string; end_date: string | null } | null | undefined,
): boolean {
  if (!m || m.status !== "active" || !m.end_date) return false;
  return new Date(m.end_date) >= new Date(new Date().toDateString());
}
