import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin / staff membership API (Stage 3+).
//
// Two roles, both authenticate by password only:
//   • admin  — the ADMIN_PANEL_PASSWORD env secret (master). Can do everything.
//   • staff  — a row in gym_staff (password hashed). Can verify / activate.
// Passwords are SHA-256-hashed with the service-role key as a pepper — never
// stored plaintext. gym_staff / gym_checkins are service-role-only (RLS locked).
//
// Panels (static, hosted on Vercel) call this JSON API with { password, action }.
// Deploy with `--no-verify-jwt` (public; password is the boundary). CORS open.

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
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
function today(): Date {
  return new Date(new Date().toDateString());
}
function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000));
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
// Whole days from one ISO date to another (clamped at 0). Used for a frozen
// membership's preserved remaining days and for the freeze duration on unfreeze.
function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000));
}

// SHA-256(pepper + ":" + password), hex. Pepper = service-role key (secret, not
// in git). Deterministic so we can look a staff up by their password's hash.
async function hashPw(pw: string): Promise<string> {
  const pepper = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pepper + ":" + pw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Auth = { role: "admin" | "staff"; staffId: string | null; name: string };
async function authenticate(db: SupabaseClient, password: string): Promise<Auth | null> {
  const master = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (master && password === master) return { role: "admin", staffId: null, name: "admin" };
  if (!password) return null;
  const { data } = await db
    .from("gym_staff")
    .select("id, name, role, is_active")
    .eq("password_hash", await hashPw(password))
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  return { role: data.role as "admin" | "staff", staffId: data.id, name: data.name };
}

// Map a set of gym_staff ids → names (for reports).
async function staffNames(db: SupabaseClient, ids: string[]): Promise<Record<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data } = await db.from("gym_staff").select("id, name").in("id", uniq);
  return Object.fromEntries((data ?? []).map((s) => [s.id, s.name]));
}

async function handlePost(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const db = admin();
  const auth = await authenticate(db, String(body.password ?? ""));
  if (!auth) return json({ error: "Wrong password" }, 401);
  const action = body.action as string;

  // ── session / staff + admin actions ────────────────────────────────────
  if (action === "session") return json({ role: auth.role, name: auth.name });

  if (action === "plans") {
    const { data } = await db
      .from("membership_plans")
      .select("id, name_uz, price_app_uzs, duration_days")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return json({ role: auth.role, plans: data ?? [] });
  }

  if (action === "verify") {
    const userId = String(body.user_id ?? "").trim();
    if (!userId) return json({ found: false });
    const { data: m } = await db
      .from("memberships")
      .select("status, start_date, end_date, frozen_at, membership_plans(name_uz)")
      .eq("user_id", userId)
      .order("end_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const { data: prof } = await db.from("profiles").select("name").eq("id", userId).maybeSingle();
    if (!prof && !m) return json({ found: false });

    const active = !!m && m.status === "active" && !!m.end_date && new Date(m.end_date) >= today();
    const frozen = !!m && m.status === "frozen";
    // Log the door check (attendance) — only for a real profile (FK).
    if (prof) {
      await db.from("gym_checkins").insert({
        user_id: userId,
        staff_id: auth.staffId,
        was_active: active,
      });
    }
    // A frozen membership's remaining days are preserved as of the freeze date
    // (the clock stopped), so measure end_date from frozen_at, not from now.
    const daysRemaining = frozen && m?.frozen_at && m?.end_date
      ? daysBetween(m.frozen_at, m.end_date)
      : m?.end_date ? daysLeft(m.end_date) : 0;
    return json({
      found: true,
      active,
      frozen,
      status: m?.status ?? "none",
      frozen_at: m?.frozen_at ?? null,
      name: prof?.name ?? null,
      // deno-lint-ignore no-explicit-any
      plan_name: (m as any)?.membership_plans?.name_uz ?? null,
      end_date: m?.end_date ?? null,
      days_left: daysRemaining,
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
      .insert({ user_id: userId, plan_id: planId, status: "active", start_date: iso(start), end_date: iso(end) })
      .select("id")
      .single();
    if (mErr) return json({ error: mErr.message }, 500);
    await db.from("payments").insert({
      user_id: userId,
      membership_id: membership.id,
      amount_uzs: plan.price_app_uzs,
      provider: "manual",
      status: "paid",
      paid_at: new Date().toISOString(),
      activated_by: auth.staffId,
    });
    return json({ ok: true, end_date: iso(end), days_left: plan.duration_days });
  }

  // ── cash order (Variant A): the app creates a pending order (payment id in a
  // QR); staff scan it, take cash, and confirm here. ──────────────────────
  if (action === "order_detail") {
    const orderId = String(body.order_id ?? "").trim();
    if (!orderId) return json({ found: false });
    const { data: pay } = await db
      .from("payments")
      .select("id, user_id, amount_uzs, provider, status, membership_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!pay) return json({ found: false });
    const { data: prof } = await db.from("profiles").select("name").eq("id", pay.user_id).maybeSingle();
    let planName: string | null = null;
    let durationDays: number | null = null;
    if (pay.membership_id) {
      const { data: m } = await db
        .from("memberships")
        .select("membership_plans(name_uz, duration_days)")
        .eq("id", pay.membership_id)
        .maybeSingle();
      // deno-lint-ignore no-explicit-any
      planName = (m as any)?.membership_plans?.name_uz ?? null;
      // deno-lint-ignore no-explicit-any
      durationDays = (m as any)?.membership_plans?.duration_days ?? null;
    }
    return json({
      found: true,
      order_id: pay.id,
      user_id: pay.user_id,
      user_name: prof?.name ?? null,
      amount_uzs: pay.amount_uzs,
      provider: pay.provider,
      status: pay.status,
      plan_name: planName,
      duration_days: durationDays,
    });
  }

  if (action === "order_activate") {
    const orderId = String(body.order_id ?? "").trim();
    if (!orderId) return json({ error: "order_id required" }, 400);
    const { data: pay } = await db
      .from("payments")
      .select("id, user_id, status, membership_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!pay) return json({ error: "Order not found" }, 404);
    if (pay.status === "paid") return json({ error: "Bu buyurtma allaqachon faollashtirilgan" }, 400);
    if (!pay.membership_id) return json({ error: "Order has no membership" }, 400);
    const { data: m } = await db
      .from("memberships")
      .select("membership_plans(duration_days)")
      .eq("id", pay.membership_id)
      .maybeSingle();
    // deno-lint-ignore no-explicit-any
    const duration = (m as any)?.membership_plans?.duration_days as number | undefined;
    if (!duration) return json({ error: "Plan not found" }, 404);
    const start = today();
    const end = new Date(start.getTime() + duration * 86_400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    await db
      .from("memberships")
      .update({ status: "active", start_date: iso(start), end_date: iso(end) })
      .eq("id", pay.membership_id);
    await db
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString(), activated_by: auth.staffId })
      .eq("id", pay.id);
    await db.from("gym_checkins").insert({ user_id: pay.user_id, staff_id: auth.staffId, was_active: true });
    return json({ ok: true, end_date: iso(end), days_left: duration });
  }

  // ── freeze / unfreeze (staff + admin) ──────────────────────────────────
  // Pause the membership clock. Freeze records the date; unfreeze pushes the
  // end_date forward by however long it was frozen, so no paid days are lost.
  if (action === "freeze") {
    const userId = String(body.user_id ?? "").trim();
    if (!userId) return json({ error: "user_id required" }, 400);
    const { data: m } = await db
      .from("memberships")
      .select("id, status, end_date")
      .eq("user_id", userId)
      .order("end_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!m) return json({ error: "A'zolik topilmadi" }, 404);
    if (m.status !== "active" || !m.end_date || new Date(m.end_date) < today()) {
      return json({ error: "Faqat faol a'zolikni muzlatish mumkin" }, 400);
    }
    const { error } = await db
      .from("memberships")
      .update({ status: "frozen", frozen_at: isoDate(today()) })
      .eq("id", m.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, status: "frozen", days_left: daysLeft(m.end_date) });
  }

  if (action === "unfreeze") {
    const userId = String(body.user_id ?? "").trim();
    if (!userId) return json({ error: "user_id required" }, 400);
    const { data: m } = await db
      .from("memberships")
      .select("id, status, end_date, frozen_at, frozen_days_total")
      .eq("user_id", userId)
      .order("end_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!m) return json({ error: "A'zolik topilmadi" }, 404);
    if (m.status !== "frozen" || !m.frozen_at || !m.end_date) {
      return json({ error: "Bu a'zolik muzlatilmagan" }, 400);
    }
    const frozenDays = daysBetween(m.frozen_at, isoDate(today()));
    const newEnd = isoDate(new Date(new Date(m.end_date).getTime() + frozenDays * 86_400_000));
    const { error } = await db
      .from("memberships")
      .update({
        status: "active",
        end_date: newEnd,
        frozen_at: null,
        frozen_days_total: (m.frozen_days_total ?? 0) + frozenDays,
      })
      .eq("id", m.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, status: "active", end_date: newEnd, days_left: daysLeft(newEnd), frozen_days: frozenDays });
  }

  // ── admin-only actions ─────────────────────────────────────────────────
  if (auth.role !== "admin") return json({ error: "Admin only" }, 403);

  if (action === "staff_list") {
    const { data } = await db
      .from("gym_staff")
      .select("id, name, role, is_active, created_at")
      .order("created_at", { ascending: true });
    return json({ staff: data ?? [] });
  }

  if (action === "staff_add" || action === "staff_set_password") {
    // NB: the new staff password is `new_password` — `password` is the admin's
    // own auth password (used by authenticate() above), so they must not collide.
    const pw = String(body.new_password ?? "").trim();
    if (!pw) return json({ error: "new_password required" }, 400);
    const hash = await hashPw(pw);
    if (action === "staff_add") {
      const name = String(body.name ?? "").trim();
      if (!name) return json({ error: "name required" }, 400);
      const { error } = await db.from("gym_staff").insert({ name, password_hash: hash, role: "staff" });
      if (error) return json({ error: error.code === "23505" ? "Bu parol band — boshqasini tanlang" : error.message }, 400);
    } else {
      const staffId = String(body.staff_id ?? "").trim();
      if (!staffId) return json({ error: "staff_id required" }, 400);
      const { error } = await db.from("gym_staff").update({ password_hash: hash }).eq("id", staffId);
      if (error) return json({ error: error.code === "23505" ? "Bu parol band — boshqasini tanlang" : error.message }, 400);
    }
    return json({ ok: true });
  }

  if (action === "staff_set_active") {
    const staffId = String(body.staff_id ?? "").trim();
    await db.from("gym_staff").update({ is_active: !!body.is_active }).eq("id", staffId);
    return json({ ok: true });
  }

  if (action === "staff_delete") {
    const staffId = String(body.staff_id ?? "").trim();
    await db.from("gym_staff").delete().eq("id", staffId);
    return json({ ok: true });
  }

  // Admin changes their OWN password. `password` (verified admin above) is the
  // current password; the new one is stored as a gym_staff role='admin' row.
  // The env ADMIN_PANEL_PASSWORD stays as a permanent recovery key.
  if (action === "admin_set_password") {
    const pw = String(body.new_password ?? "").trim();
    if (!pw) return json({ error: "new_password required" }, 400);
    const hash = await hashPw(pw);
    const { data: existing } = await db.from("gym_staff").select("id").eq("role", "admin").limit(1).maybeSingle();
    const res = existing
      ? await db.from("gym_staff").update({ password_hash: hash, is_active: true }).eq("id", existing.id)
      : await db.from("gym_staff").insert({ name: "admin", role: "admin", password_hash: hash });
    if (res.error) return json({ error: res.error.code === "23505" ? "Bu parol band — boshqasini tanlang" : res.error.message }, 400);
    return json({ ok: true });
  }

  if (action === "members_search") {
    const q = String(body.q ?? "").trim();
    if (!q) return json({ members: [] });
    const { data } = await db.from("profiles").select("id, name").ilike("name", `%${q}%`).limit(25);
    return json({ members: data ?? [] });
  }

  if (action === "member_detail") {
    const userId = String(body.user_id ?? "").trim();
    if (!userId) return json({ found: false });
    const { data: prof } = await db.from("profiles").select("name").eq("id", userId).maybeSingle();
    const { data: m } = await db
      .from("memberships")
      .select("status, start_date, end_date, frozen_at, membership_plans(name_uz)")
      .eq("user_id", userId)
      .order("end_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const { data: pays } = await db
      .from("payments")
      .select("amount_uzs, provider, status, paid_at, created_at, activated_by")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    const { data: checks } = await db
      .from("gym_checkins")
      .select("was_active, checked_at, staff_id")
      .eq("user_id", userId)
      .order("checked_at", { ascending: false })
      .limit(50);
    if (!prof && !m) return json({ found: false });

    const names = await staffNames(db, [
      ...(pays ?? []).map((p) => p.activated_by as string),
      ...(checks ?? []).map((c) => c.staff_id as string),
    ]);
    const active = !!m && m.status === "active" && !!m.end_date && new Date(m.end_date) >= today();
    return json({
      found: true,
      name: prof?.name ?? null,
      active,
      // deno-lint-ignore no-explicit-any
      membership: m ? { status: m.status, start_date: m.start_date, end_date: m.end_date, frozen_at: m.frozen_at, plan_name: (m as any).membership_plans?.name_uz ?? null } : null,
      payments: (pays ?? []).map((p) => ({ ...p, staff_name: p.activated_by ? names[p.activated_by] ?? null : null })),
      checkins: (checks ?? []).map((c) => ({ ...c, staff_name: c.staff_id ? names[c.staff_id] ?? null : "admin" })),
    });
  }

  if (action === "checkins_recent") {
    const { data: rows } = await db
      .from("gym_checkins")
      .select("id, user_id, staff_id, was_active, checked_at")
      .order("checked_at", { ascending: false })
      .limit(40);
    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profs } = userIds.length
      ? await db.from("profiles").select("id, name").in("id", userIds)
      : { data: [] as { id: string; name: string | null }[] };
    const pmap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.name]));
    const names = await staffNames(db, (rows ?? []).map((r) => r.staff_id as string));
    return json({
      checkins: (rows ?? []).map((r) => ({
        ...r,
        member_name: pmap[r.user_id] ?? null,
        staff_name: r.staff_id ? names[r.staff_id] ?? null : "admin",
      })),
    });
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
  return json({ ok: true, api: "admin-verify", note: "POST { password, action }" });
});
