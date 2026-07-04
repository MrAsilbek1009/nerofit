import { supabase } from "@/lib/supabase";
import type { Membership, MembershipPlan, Payment } from "@/types/db";

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
