import { createClient, type SupabaseClient } from "./deps.ts";
import type { Auth } from "./types.ts";

export function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// Record a mutating action (who/what/when). Non-throwing — an audit failure must
// never break the underlying operation.
export async function audit(
  db: SupabaseClient,
  auth: Auth | null,
  action: string,
  target: string | null,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.from("admin_audit").insert({
      actor_role: auth?.role ?? null,
      actor_name: auth?.name ?? null,
      actor_staff_id: auth?.staffId ?? null,
      action,
      target,
      meta,
    });
  } catch (_e) { /* ignore */ }
}

export async function staffNames(db: SupabaseClient, ids: string[]): Promise<Record<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data } = await db.from("gym_staff").select("id, name").in("id", uniq);
  return Object.fromEntries((data ?? []).map((s) => [s.id, s.name]));
}

// Per-actor rate limit for sensitive mutations (S1): count this actor's recent
// audit rows for `action` within a window. Generous ceilings — never hit in
// normal use, but stop a stolen token from mass-abusing refund/delete/password.
export async function rateLimited(
  db: SupabaseClient,
  auth: Auth,
  action: string,
  max: number,
  windowMin: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMin * 60_000).toISOString();
  const { data } = await db
    .from("admin_audit")
    .select("id")
    .eq("action", action)
    .eq("actor_name", auth.name)
    .gte("created_at", since);
  return (data ?? []).length >= max;
}
