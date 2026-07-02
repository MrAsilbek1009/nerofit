import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin membership verification API (Stage 3).
//
// JSON API for the gym-staff panel. The panel HTML is hosted on GitHub Pages
// (Supabase's functions domain forces text/plain + a sandbox CSP, so it can't
// serve an interactive page itself). The page POSTs here with the shared panel
// password; we look up / activate memberships with the service role (bypassing
// owner-RLS). CORS is open so the Pages origin can call it.
//
// Actions (POST JSON, all require { password }):
//   { action:"verify",   user_id }            → membership status for a member
//   { action:"activate", user_id, plan_id }   → manual (cash) activation
//   { action:"plans" }                          → active tariffs (for the dropdown)
//
// Deploy with `--no-verify-jwt` (public; the password is the boundary).
// Secret: ADMIN_PANEL_PASSWORD. Auto-injected: SUPABASE_URL, SERVICE_ROLE_KEY.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function today(): Date {
  return new Date(new Date().toDateString());
}
function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000));
}

async function handlePost(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const password = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!password) return json({ error: "ADMIN_PANEL_PASSWORD not set" }, 500);
  if (body.password !== password) return json({ error: "Wrong password" }, 401);

  const db = admin();
  const action = body.action as string;

  if (action === "plans") {
    const { data } = await db
      .from("membership_plans")
      .select("id, name_uz, price_app_uzs, duration_days")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return json({ plans: data ?? [] });
  }

  if (action === "verify") {
    const userId = String(body.user_id ?? "").trim();
    if (!userId) return json({ found: false });
    const { data: m } = await db
      .from("memberships")
      .select("status, start_date, end_date, membership_plans(name_uz)")
      .eq("user_id", userId)
      .order("end_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const { data: prof } = await db
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();

    if (!prof && !m) return json({ found: false });
    const active = !!m && m.status === "active" && !!m.end_date && new Date(m.end_date) >= today();
    return json({
      found: true,
      active,
      status: m?.status ?? "none",
      name: prof?.name ?? null,
      // deno-lint-ignore no-explicit-any
      plan_name: (m as any)?.membership_plans?.name_uz ?? null,
      end_date: m?.end_date ?? null,
      days_left: m?.end_date ? daysLeft(m.end_date) : 0,
    });
  }

  if (action === "activate") {
    const userId = String(body.user_id ?? "").trim();
    const planId = String(body.plan_id ?? "").trim();
    if (!userId || !planId) return json({ error: "user_id and plan_id required" }, 400);

    const { data: plan } = await db
      .from("membership_plans")
      .select("duration_days, price_app_uzs")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) return json({ error: "Plan not found" }, 404);

    const start = today();
    const end = new Date(start.getTime() + plan.duration_days * 86_400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const { data: membership, error: mErr } = await db
      .from("memberships")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        start_date: iso(start),
        end_date: iso(end),
      })
      .select("id")
      .single();
    if (mErr) return json({ error: mErr.message }, 500);

    // Paper trail for cash payments.
    await db.from("payments").insert({
      user_id: userId,
      membership_id: membership.id,
      amount_uzs: plan.price_app_uzs,
      provider: "manual",
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    return json({ ok: true, end_date: iso(end), days_left: plan.duration_days });
  }

  return json({ error: "Unknown action" }, 400);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });
  if (req.method === "POST") {
    try {
      return await handlePost(req);
    } catch (e) {
      return json({ error: String(e instanceof Error ? e.message : e) }, 500);
    }
  }
  // GET: this is a JSON API — the panel UI lives on GitHub Pages.
  return json({ ok: true, api: "admin-verify", note: "POST actions: verify | activate | plans" });
});
