import { supabase } from "@/lib/supabase";
import type { Membership, MembershipPlan, Payment } from "@/types/db";

export type PaymentProvider = "payme" | "click";

// Active tariffs, cheapest/shortest first.
export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  const { data, error } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MembershipPlan[];
}

// The user's most relevant membership: latest by end_date (active or otherwise),
// or null if they've never had one.
export async function getActiveMembership(
  userId: string,
): Promise<Membership | null> {
  const { data, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", userId)
    .order("end_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Membership | null) ?? null;
}

export async function getPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

// Start checkout for a plan via Payme/Click. The Edge Function creates a pending
// membership + payment order and returns a provider checkout URL for the app to
// open. The provider then calls `payments-webhook`, which activates the
// membership; the screen refetches on focus.
export async function startCheckout(
  planId: string,
  provider: PaymentProvider,
): Promise<{ checkoutUrl: string; payment_id: string }> {
  // Fresh session + explicit JWT (functions.invoke doesn't reliably attach it
  // on web — same pattern as chat/foodScan).
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated — please log in again.");

  const { data, error } = await supabase.functions.invoke("membership-checkout", {
    body: { plan_id: planId, provider },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.text === "function") {
      const body = await ctx.text().catch(() => "");
      throw new Error(`HTTP ${ctx.status}: ${body || error.message}`);
    }
    throw error;
  }
  return data as { checkoutUrl: string; payment_id: string };
}
