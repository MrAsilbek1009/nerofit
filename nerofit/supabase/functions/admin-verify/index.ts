import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin / staff membership API.
//
// Auth (A0 security foundation):
//   • `login { password }` → issues a short-lived session TOKEN (12h). The token
//     is what panels send on every subsequent request — the password travels
//     only once, at login. Brute-force rate-limited per IP.
//   • Every other action accepts `{ token }`. For backward compatibility it also
//     still accepts `{ password }` on each request (legacy panels) — remove once
//     all panels are on tokens.
//   Roles: owner (master ADMIN_PANEL_PASSWORD) · admin · staff.
//   Every mutating action is written to `admin_audit` (who/what/when).
//
// Passwords are SHA-256-hashed with the service-role key as a pepper — never
// stored plaintext. admin_sessions/admin_audit/gym_staff are service-role-only.
// Deploy with `--no-verify-jwt` (public; the token/password is the boundary).

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
function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000));
}
function getIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function stackBase(db: SupabaseClient, userId: string): Promise<Date> {
  const { data } = await db
    .from("memberships")
    .select("end_date")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("end_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (data?.end_date && new Date(data.end_date) >= today()) return new Date(data.end_date);
  return today();
}

// SHA-256(pepper + ":" + password), hex. Pepper = service-role key (secret).
async function hashPw(pw: string): Promise<string> {
  const pepper = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return await sha256Hex(pepper + ":" + pw);
}

type Auth = { role: "owner" | "admin" | "staff"; staffId: string | null; name: string };
const isAdmin = (a: Auth) => a.role === "owner" || a.role === "admin";

async function authenticate(db: SupabaseClient, password: string): Promise<Auth | null> {
  const master = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (master && password === master) return { role: "owner", staffId: null, name: "owner" };
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

// Resolve a session token → Auth, or null if unknown/expired.
async function authByToken(db: SupabaseClient, token: string): Promise<Auth | null> {
  if (!token) return null;
  const th = await sha256Hex(token);
  const { data } = await db
    .from("admin_sessions")
    .select("staff_id, role, name, expires_at")
    .eq("token_hash", th)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) {
    await db.from("admin_sessions").delete().eq("token_hash", th);
    return null;
  }
  await db.from("admin_sessions").update({ last_seen: new Date().toISOString() }).eq("token_hash", th);
  return { role: data.role as Auth["role"], staffId: data.staff_id, name: data.name };
}

// Record a mutating action. Non-throwing — audit failure must never break the op.
async function audit(
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

async function staffNames(db: SupabaseClient, ids: string[]): Promise<Record<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data } = await db.from("gym_staff").select("id, name").in("id", uniq);
  return Object.fromEntries((data ?? []).map((s) => [s.id, s.name]));
}

async function handlePost(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const db = admin();
  const action = body.action as string;

  // ── login: password → token (rate-limited per IP) ──────────────────────
  if (action === "login") {
    const ip = getIp(req);
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: fails } = await db
      .from("admin_audit")
      .select("meta")
      .eq("action", "login_failed")
      .gte("created_at", since);
    // deno-lint-ignore no-explicit-any
    const recent = (fails ?? []).filter((r) => (r.meta as any)?.ip === ip).length;
    if (recent >= 8) return json({ error: "Juda ko'p urinish. 15 daqiqadan so'ng qayta urining." }, 429);

    const a = await authenticate(db, String(body.password ?? ""));
    if (!a) {
      await audit(db, null, "login_failed", null, { ip });
      return json({ error: "Parol noto'g'ri" }, 401);
    }
    const token = newToken();
    const { error: sErr } = await db.from("admin_sessions").insert({
      token_hash: await sha256Hex(token),
      staff_id: a.staffId,
      role: a.role,
      name: a.name,
      expires_at: new Date(Date.now() + 12 * 3_600_000).toISOString(),
    });
    // Don't hand back a token we couldn't store (e.g. migration 0020 not applied).
    if (sErr) return json({ error: "Sessiya saqlanmadi — migration 0020 qo'llanganmi?" }, 500);
    await audit(db, a, "login", null, { ip });
    return json({ ok: true, token, role: a.role, name: a.name });
  }

  // ── logout: drop the token (no auth needed) ────────────────────────────
  if (action === "logout") {
    const token = String(body.token ?? "");
    if (token) await db.from("admin_sessions").delete().eq("token_hash", await sha256Hex(token));
    return json({ ok: true });
  }

  // Resolve auth: token first, else legacy password (backward compat).
  const auth = body.token
    ? await authByToken(db, String(body.token))
    : await authenticate(db, String(body.password ?? ""));
  if (!auth) return json({ error: body.token ? "Sessiya tugagan — qayta kiring" : "Wrong password" }, 401);

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
    if (prof) {
      await db.from("gym_checkins").insert({ user_id: userId, staff_id: auth.staffId, was_active: active });
    }
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
    const base = await stackBase(db, userId);
    const end = new Date(base.getTime() + plan.duration_days * 86_400_000);
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
    await audit(db, auth, "activate", userId, { plan_id: planId, end_date: iso(end) });
    return json({ ok: true, end_date: iso(end), days_left: daysLeft(iso(end)) });
  }

  // ── cash order (Variant A) ─────────────────────────────────────────────
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
    const base = await stackBase(db, pay.user_id);
    const end = new Date(base.getTime() + duration * 86_400_000);
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
    await audit(db, auth, "order_activate", pay.user_id, { order_id: orderId, end_date: iso(end) });
    return json({ ok: true, end_date: iso(end), days_left: daysLeft(iso(end)) });
  }

  // ── freeze / unfreeze (staff + admin) ──────────────────────────────────
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
    await audit(db, auth, "freeze", userId, {});
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
    await audit(db, auth, "unfreeze", userId, { frozen_days: frozenDays });
    return json({ ok: true, status: "active", end_date: newEnd, days_left: daysLeft(newEnd), frozen_days: frozenDays });
  }

  // ── admin/owner-only actions ───────────────────────────────────────────
  if (!isAdmin(auth)) return json({ error: "Admin only" }, 403);

  if (action === "staff_list") {
    const { data } = await db
      .from("gym_staff")
      .select("id, name, role, is_active, created_at")
      .order("created_at", { ascending: true });
    return json({ staff: data ?? [] });
  }

  if (action === "staff_add" || action === "staff_set_password") {
    const pw = String(body.new_password ?? "").trim();
    if (!pw) return json({ error: "new_password required" }, 400);
    const hash = await hashPw(pw);
    if (action === "staff_add") {
      const name = String(body.name ?? "").trim();
      if (!name) return json({ error: "name required" }, 400);
      const { error } = await db.from("gym_staff").insert({ name, password_hash: hash, role: "staff" });
      if (error) return json({ error: error.code === "23505" ? "Bu parol band — boshqasini tanlang" : error.message }, 400);
      await audit(db, auth, "staff_add", name, {});
    } else {
      const staffId = String(body.staff_id ?? "").trim();
      if (!staffId) return json({ error: "staff_id required" }, 400);
      const { error } = await db.from("gym_staff").update({ password_hash: hash }).eq("id", staffId);
      if (error) return json({ error: error.code === "23505" ? "Bu parol band — boshqasini tanlang" : error.message }, 400);
      await audit(db, auth, "staff_set_password", staffId, {});
    }
    return json({ ok: true });
  }

  if (action === "staff_set_active") {
    const staffId = String(body.staff_id ?? "").trim();
    await db.from("gym_staff").update({ is_active: !!body.is_active }).eq("id", staffId);
    await audit(db, auth, "staff_set_active", staffId, { is_active: !!body.is_active });
    return json({ ok: true });
  }

  if (action === "staff_delete") {
    const staffId = String(body.staff_id ?? "").trim();
    await db.from("gym_staff").delete().eq("id", staffId);
    await audit(db, auth, "staff_delete", staffId, {});
    return json({ ok: true });
  }

  if (action === "admin_set_password") {
    const pw = String(body.new_password ?? "").trim();
    if (!pw) return json({ error: "new_password required" }, 400);
    const hash = await hashPw(pw);
    const { data: existing } = await db.from("gym_staff").select("id").eq("role", "admin").limit(1).maybeSingle();
    const res = existing
      ? await db.from("gym_staff").update({ password_hash: hash, is_active: true }).eq("id", existing.id)
      : await db.from("gym_staff").insert({ name: "admin", role: "admin", password_hash: hash });
    if (res.error) return json({ error: res.error.code === "23505" ? "Bu parol band — boshqasini tanlang" : res.error.message }, 400);
    await audit(db, auth, "admin_set_password", null, {});
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

  // ── dashboard KPIs + trend charts (admin/owner) ────────────────────────
  if (action === "dashboard_stats") {
    const TZ = 5; // Uzbekistan = UTC+5 (no DST)
    const day = 86_400_000;
    const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    const weekStart = new Date(todayStart.getTime() - 6 * day);
    const monthStart = new Date(todayStart.getTime() - 29 * day);
    const chartStart = new Date(todayStart.getTime() - 13 * day);
    const todayIso = todayStart.toISOString().slice(0, 10);
    const in7Iso = new Date(todayStart.getTime() + 7 * day).toISOString().slice(0, 10);

    // Members (active + frozen only — bounded by active membership count).
    const { data: mems } = await db
      .from("memberships")
      .select("user_id, status, end_date")
      .in("status", ["active", "frozen"]);
    const active = new Set<string>(), frozen = new Set<string>(), expiring = new Set<string>();
    for (const m of mems ?? []) {
      if (m.status === "active" && m.end_date && m.end_date >= todayIso) {
        active.add(m.user_id);
        if (m.end_date <= in7Iso) expiring.add(m.user_id);
      } else if (m.status === "frozen") frozen.add(m.user_id);
    }

    // Paid payments, last 30 days.
    const { data: pays } = await db
      .from("payments")
      .select("amount_uzs, paid_at")
      .eq("status", "paid")
      .gte("paid_at", monthStart.toISOString());
    let revToday = 0, revWeek = 0, revMonth = 0, salesToday = 0;
    const revByDay: Record<string, number> = {};
    for (const p of pays ?? []) {
      if (!p.paid_at) continue;
      const amt = p.amount_uzs || 0;
      const t = new Date(p.paid_at);
      revMonth += amt;
      if (t >= weekStart) revWeek += amt;
      if (t >= todayStart) { revToday += amt; salesToday++; }
      if (t >= chartStart) { const k = p.paid_at.slice(5, 10); revByDay[k] = (revByDay[k] || 0) + amt; }
    }
    const revDaily: { d: string; v: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const k = new Date(todayStart.getTime() - i * day).toISOString().slice(5, 10);
      revDaily.push({ d: k, v: revByDay[k] || 0 });
    }

    // Check-ins, last 14 days → today count + by-hour distribution (local time).
    const { data: checks } = await db
      .from("gym_checkins")
      .select("checked_at")
      .gte("checked_at", chartStart.toISOString());
    let checkinsToday = 0;
    const byHour = new Array(24).fill(0);
    for (const c of checks ?? []) {
      if (!c.checked_at) continue;
      const t = new Date(c.checked_at);
      if (t >= todayStart) checkinsToday++;
      byHour[(t.getUTCHours() + TZ) % 24]++;
    }
    let peakHour: number | null = null, peakVal = 0;
    byHour.forEach((v, h) => { if (v > peakVal) { peakVal = v; peakHour = h; } });

    return json({
      active: active.size,
      expiring7: expiring.size,
      frozen: frozen.size,
      checkinsToday,
      salesToday,
      revenueToday: revToday,
      revenueWeek: revWeek,
      revenueMonth: revMonth,
      peakHour,
      revDaily,
      checkinsByHour: byHour,
    });
  }

  // ── audit log viewer (admin/owner) ─────────────────────────────────────
  if (action === "audit_list") {
    const { data } = await db
      .from("admin_audit")
      .select("id, actor_role, actor_name, action, target, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    return json({ audit: data ?? [] });
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
  return json({ ok: true, api: "admin-verify", note: "POST { action, token|password }" });
});
