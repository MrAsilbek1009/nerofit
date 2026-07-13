// Pinned to an exact version (S1 supply-chain hardening) — a floating `@2` would
// pull whatever is latest on every redeploy. Bump deliberately, verify on deploy.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
// Pure money/status logic (S2) — unit-tested in logic.test.ts, guarded by CI.
import {
  aggregateCashByStaff,
  aggregateRevenue,
  computeExtendedEnd,
  dayEndUtc,
  dayStartUtc,
  deriveMemberStatus,
  validateExercise,
  validatePlan,
  validateVideoUrl,
} from "./logic.ts";

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

// CORS (S1): no wildcard Access-Control-Allow-Origin. The allowed origin is
// reflected per-request in Deno.serve() only when it passes allowedOrigin() —
// the panels are on *.vercel.app; localhost is for dev. Random sites get no
// ACAO header and can't read responses. (Auth is token-in-body, so this is
// defense-in-depth, not the primary boundary.)
const cors = {
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// Reflect the request Origin only if it's a panel we trust. Tighten to exact
// prod aliases once confirmed (gym-admin / gym-panel Vercel URLs).
function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const ok = origin.endsWith(".vercel.app") ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");
  return ok ? origin : null;
}
const SESSION_TTL_MS = 8 * 3_600_000; // 8h (S1: was 12h), slid forward on activity
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);
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
  // Sliding session: each active request pushes expiry out, so an idle session
  // dies after SESSION_TTL_MS but an in-use one stays alive.
  const now = new Date();
  await db.from("admin_sessions").update({
    last_seen: now.toISOString(),
    expires_at: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  }).eq("token_hash", th);
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

// Per-actor rate limit for sensitive mutations (S1): count this actor's recent
// audit rows for `action` within a window. Generous ceilings — never hit in
// normal use, but stop a stolen token from mass-abusing refund/delete/password.
async function rateLimited(
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
      expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
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

  // Resolve auth: TOKEN ONLY (S1 removed the legacy per-request {password} path).
  // The password is accepted only by `login` above; every other action needs a
  // valid session token.
  const auth = await authByToken(db, String(body.token ?? ""));
  if (!auth) return json({ error: "Sessiya tugagan — qayta kiring" }, 401);

  // logout_all: drop every session for this actor (chiqish — barcha qurilmadan).
  if (action === "logout_all") {
    if (auth.staffId) await db.from("admin_sessions").delete().eq("staff_id", auth.staffId);
    else await db.from("admin_sessions").delete().is("staff_id", null); // owner/master
    await audit(db, auth, "logout_all", null, {});
    return json({ ok: true });
  }

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

  // ── A4: tariff (plan) management (admin/owner) ─────────────────────────
  // Full list incl. inactive (the `plans` action above stays active-only for
  // the staff picker). No hard delete — plans are FK'd by memberships/payments;
  // deactivate (is_active=false) hides a plan instead.
  if (action === "plan_list_all") {
    const { data } = await db
      .from("membership_plans")
      .select("id, name_uz, duration_days, price_app_uzs, price_gym_uzs, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name_uz", { ascending: true });
    return json({ plans: data ?? [] });
  }

  if (action === "plan_create") {
    const v = validatePlan(body);
    if (!v.ok) return json({ error: v.error }, 400);
    const { data, error } = await db.from("membership_plans").insert(v.value).select("id").single();
    if (error) return json({ error: error.message }, 500);
    await audit(db, auth, "plan_create", data.id, { name_uz: v.value.name_uz });
    return json({ ok: true, id: data.id });
  }

  if (action === "plan_update") {
    const planId = String(body.plan_id ?? "").trim();
    if (!isUuid(planId)) return json({ error: "plan_id noto'g'ri" }, 400);
    const v = validatePlan(body);
    if (!v.ok) return json({ error: v.error }, 400);
    const { error } = await db.from("membership_plans").update(v.value).eq("id", planId);
    if (error) return json({ error: error.message }, 500);
    await audit(db, auth, "plan_update", planId, { name_uz: v.value.name_uz });
    return json({ ok: true });
  }

  if (action === "plan_set_active") {
    const planId = String(body.plan_id ?? "").trim();
    if (!isUuid(planId)) return json({ error: "plan_id noto'g'ri" }, 400);
    const isActive = !!body.is_active;
    const { error } = await db.from("membership_plans").update({ is_active: isActive }).eq("id", planId);
    if (error) return json({ error: error.message }, 500);
    await audit(db, auth, "plan_set_active", planId, { is_active: isActive });
    return json({ ok: true });
  }

  // ── C1: content — exercise library + videos (admin/owner) ──────────────
  if (action === "exercise_list") {
    const { data } = await db
      .from("exercises")
      .select("id, title, target_muscles, default_sets, default_reps, image_url, exercise_videos(id, url, duration_sec, provider)")
      .order("title", { ascending: true });
    return json({ exercises: data ?? [] });
  }

  if (action === "exercise_create") {
    const v = validateExercise(body);
    if (!v.ok) return json({ error: v.error }, 400);
    const { data, error } = await db.from("exercises").insert(v.value).select("id").single();
    if (error) return json({ error: error.message }, 500);
    await audit(db, auth, "exercise_create", data.id, { title: v.value.title });
    return json({ ok: true, id: data.id });
  }

  if (action === "exercise_update") {
    const id = String(body.exercise_id ?? "").trim();
    if (!isUuid(id)) return json({ error: "exercise_id noto'g'ri" }, 400);
    const v = validateExercise(body);
    if (!v.ok) return json({ error: v.error }, 400);
    const { error } = await db.from("exercises").update(v.value).eq("id", id);
    if (error) return json({ error: error.message }, 500);
    await audit(db, auth, "exercise_update", id, { title: v.value.title });
    return json({ ok: true });
  }

  // Guarded delete — never destroy an exercise that's used in a workout or has
  // user history (exercise_logs). Its videos cascade-delete with it.
  if (action === "exercise_delete") {
    const id = String(body.exercise_id ?? "").trim();
    if (!isUuid(id)) return json({ error: "exercise_id noto'g'ri" }, 400);
    const { count: usedCount } = await db.from("workout_exercises").select("id", { count: "exact", head: true }).eq("exercise_id", id);
    if ((usedCount ?? 0) > 0) return json({ error: "Bu mashq dasturda ishlatilyapti — avval undan olib tashlang" }, 400);
    const { count: logCount } = await db.from("exercise_logs").select("id", { count: "exact", head: true }).eq("exercise_id", id);
    if ((logCount ?? 0) > 0) return json({ error: "Bu mashqda foydalanuvchi tarixi bor — o'chirib bo'lmaydi" }, 400);
    const { error } = await db.from("exercises").delete().eq("id", id);
    if (error) return json({ error: error.message }, 500);
    await audit(db, auth, "exercise_delete", id, {});
    return json({ ok: true });
  }

  if (action === "exercise_video_add") {
    const id = String(body.exercise_id ?? "").trim();
    if (!isUuid(id)) return json({ error: "exercise_id noto'g'ri" }, 400);
    const v = validateVideoUrl(body.url, body.duration_sec);
    if (!v.ok) return json({ error: v.error }, 400);
    const provider = (String(body.provider ?? "").trim().slice(0, 30)) || "url";
    const { error } = await db.from("exercise_videos").insert({ exercise_id: id, url: v.value.url, duration_sec: v.value.duration_sec, provider });
    if (error) return json({ error: error.message }, 500);
    await audit(db, auth, "exercise_video_add", id, {});
    return json({ ok: true });
  }

  if (action === "exercise_video_delete") {
    const videoId = String(body.video_id ?? "").trim();
    if (!isUuid(videoId)) return json({ error: "video_id noto'g'ri" }, 400);
    const { error } = await db.from("exercise_videos").delete().eq("id", videoId);
    if (error) return json({ error: error.message }, 500);
    await audit(db, auth, "exercise_video_delete", videoId, {});
    return json({ ok: true });
  }

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
    if (!isUuid(staffId)) return json({ error: "staff_id noto'g'ri" }, 400);
    if (await rateLimited(db, auth, "staff_delete", 10, 10)) {
      return json({ error: "Juda ko'p urinish — biroz kuting" }, 429);
    }
    await db.from("gym_staff").delete().eq("id", staffId);
    await audit(db, auth, "staff_delete", staffId, {});
    return json({ ok: true });
  }

  if (action === "admin_set_password") {
    const pw = String(body.new_password ?? "").trim();
    if (!pw) return json({ error: "new_password required" }, 400);
    if (await rateLimited(db, auth, "admin_set_password", 5, 10)) {
      return json({ error: "Juda ko'p urinish — biroz kuting" }, 429);
    }
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
    const { data: notes } = await db
      .from("member_notes")
      .select("body, author_name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
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
      notes: notes ?? [],
    });
  }

  // ── members list: paginated + filtered (admin/owner) ───────────────────
  // Reduces the memberships table to the CURRENT membership per user, derives a
  // display status, then filters/sorts/paginates. Single-gym scale — if the
  // memberships table ever grows huge, move this to a DB view / RPC.
  if (action === "members_list") {
    const statusFilter = String(body.status ?? "all");
    const planId = String(body.plan_id ?? "").trim();
    const q = String(body.q ?? "").trim().toLowerCase();
    const sort = String(body.sort ?? "asc") === "desc" ? "desc" : "asc"; // by end_date
    const limit = Math.min(200, Math.max(1, Math.floor(Number(body.limit) || 25)));
    const offset = Math.max(0, Math.floor(Number(body.offset) || 0));

    const day = 86_400_000;
    const todayIso = new Date().toISOString().slice(0, 10);
    const in7Iso = new Date(Date.now() + 7 * day).toISOString().slice(0, 10);

    const { data: rows } = await db
      .from("memberships")
      .select("id, user_id, plan_id, status, end_date, frozen_at, created_at, membership_plans(name_uz)")
      .order("end_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    // deno-lint-ignore no-explicit-any
    const current = new Map<string, any>();
    for (const r of rows ?? []) if (!current.has(r.user_id)) current.set(r.user_id, r);

    const userIds = [...current.keys()];
    const nameMap: Record<string, string | null> = {};
    for (let i = 0; i < userIds.length; i += 300) {
      const { data: profs } = await db.from("profiles").select("id, name").in("id", userIds.slice(i, i + 300));
      for (const p of profs ?? []) nameMap[p.id] = p.name;
    }

    let list = userIds.map((uid) => {
      const m = current.get(uid);
      return {
        user_id: uid,
        name: nameMap[uid] ?? null,
        status: deriveMemberStatus(m, todayIso, in7Iso),
        plan_id: m.plan_id,
        // deno-lint-ignore no-explicit-any
        plan_name: (m as any).membership_plans?.name_uz ?? null,
        end_date: m.end_date,
        frozen_at: m.frozen_at,
      };
    });

    if (statusFilter !== "all") list = list.filter((m) => m.status === statusFilter);
    if (planId) list = list.filter((m) => m.plan_id === planId);
    if (q) list = list.filter((m) => (m.name ?? "").toLowerCase().includes(q) || m.user_id.toLowerCase().startsWith(q));

    list.sort((a, b) => {
      const ea = a.end_date ?? "", eb = b.end_date ?? "";
      if (ea !== eb) {
        if (!ea) return 1;
        if (!eb) return -1;
        return sort === "desc" ? (ea < eb ? 1 : -1) : (ea < eb ? -1 : 1);
      }
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    return json({ members: list.slice(offset, offset + limit), total: list.length, limit, offset });
  }

  // ── add an internal note to a member (admin/owner) ─────────────────────
  if (action === "member_note_add") {
    const userId = String(body.user_id ?? "").trim();
    const noteBody = String(body.body ?? "").trim();
    if (!userId || !noteBody) return json({ error: "user_id va izoh kerak" }, 400);
    if (noteBody.length > 1000) return json({ error: "Izoh juda uzun (max 1000)" }, 400);
    const { error } = await db.from("member_notes").insert({
      user_id: userId,
      author_staff_id: auth.staffId,
      author_name: auth.name,
      body: noteBody,
    });
    if (error) return json({ error: error.message }, 500);
    await audit(db, auth, "member_note_add", userId, {});
    return json({ ok: true });
  }

  // ── extend a member's current period by N days (admin/owner) ───────────
  // Manual comp / correction (no payment). Base = later of current end and today
  // so we never extend from the past. Reactivates an expired period; frozen stays
  // frozen (the extra days apply once it thaws).
  if (action === "membership_extend") {
    const userId = String(body.user_id ?? "").trim();
    const days = Math.floor(Number(body.days));
    if (!userId) return json({ error: "user_id required" }, 400);
    if (!Number.isFinite(days) || days < 1 || days > 365) return json({ error: "Kun 1..365 bo'lishi kerak" }, 400);
    const { data: m } = await db
      .from("memberships")
      .select("id, status, end_date")
      .eq("user_id", userId)
      .order("end_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!m) return json({ error: "A'zolik topilmadi" }, 404);
    const newEnd = computeExtendedEnd(m.end_date, days, today());
    const patch: Record<string, unknown> = { end_date: newEnd };
    if (m.status !== "frozen") patch.status = "active";
    const { error } = await db.from("memberships").update(patch).eq("id", m.id);
    if (error) return json({ error: error.message }, 500);
    await audit(db, auth, "membership_extend", userId, { days, end_date: newEnd });
    return json({ ok: true, end_date: newEnd, days_left: daysLeft(newEnd) });
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

  // ── A3 finance: payments journal (admin/owner) ─────────────────────────
  // Paginated payment journal with provider/status/date filters + name search,
  // plus the filtered total sum (over the whole filter, not just the page).
  if (action === "payments_list") {
    const provider = String(body.provider ?? "all");
    const statusF = String(body.status ?? "all");
    const fromDate = String(body.from ?? "").trim();
    const toDate = String(body.to ?? "").trim();
    const q = String(body.q ?? "").trim();
    const limit = Math.min(200, Math.max(1, Math.floor(Number(body.limit) || 25)));
    const offset = Math.max(0, Math.floor(Number(body.offset) || 0));

    // Name search → resolve to user_ids first (empty list = match nothing).
    let uidFilter: string[] | null = null;
    if (q) {
      const { data: profs } = await db.from("profiles").select("id").ilike("name", `%${q}%`).limit(500);
      uidFilter = (profs ?? []).map((p) => p.id);
      if (uidFilter.length === 0) uidFilter = [q]; // fall back to raw id (exact) — or nothing
    }

    // deno-lint-ignore no-explicit-any
    const applyFilters = (query: any) => {
      if (provider !== "all") query = query.eq("provider", provider);
      if (statusF !== "all") query = query.eq("status", statusF);
      if (fromDate) query = query.gte("created_at", dayStartUtc(fromDate));
      if (toDate) query = query.lt("created_at", dayEndUtc(toDate));
      if (uidFilter) query = query.in("user_id", uidFilter);
      return query;
    };

    const { data: pays, count } = await applyFilters(
      db.from("payments").select(
        "id, user_id, membership_id, amount_uzs, provider, status, paid_at, created_at, activated_by",
        { count: "exact" },
      ),
    ).order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: sumRows } = await applyFilters(db.from("payments").select("amount_uzs"));
    const sum = (sumRows ?? []).reduce((a: number, r: { amount_uzs: number }) => a + (r.amount_uzs || 0), 0);

    // applyFilters is loosely typed → coerce the rows to a concrete shape here.
    // deno-lint-ignore no-explicit-any
    const payRows = (pays ?? []) as any[];
    const uids = [...new Set(payRows.map((p) => p.user_id as string))];
    const nameMap: Record<string, string | null> = {};
    if (uids.length) {
      const { data: profs } = await db.from("profiles").select("id, name").in("id", uids);
      for (const p of profs ?? []) nameMap[p.id] = p.name;
    }
    const staff = await staffNames(db, payRows.map((p) => p.activated_by as string));

    return json({
      payments: payRows.map((p) => ({
        ...p,
        member_name: nameMap[p.user_id] ?? null,
        staff_name: p.activated_by ? staff[p.activated_by] ?? null : null,
      })),
      total: count ?? 0,
      sum_uzs: sum,
      limit,
      offset,
    });
  }

  // ── A3 finance: daily cash reconciliation per staff (admin/owner) ──────
  // Cash = manual (in-gym) paid activations. Grouped by who took the money, for
  // the given local day, so the register can be closed out.
  if (action === "cash_report") {
    const date = String(body.date ?? "").trim() || new Date().toISOString().slice(0, 10);
    const { data: pays } = await db
      .from("payments")
      .select("amount_uzs, activated_by")
      .eq("provider", "manual")
      .eq("status", "paid")
      .gte("paid_at", dayStartUtc(date))
      .lt("paid_at", dayEndUtc(date));
    const { groups, totalSum, totalCount } = aggregateCashByStaff(pays ?? []);
    const names = await staffNames(db, groups.map((g) => g.key).filter((k) => k !== "__owner__"));
    const staff = groups.map((g) => ({
      staff_id: g.key === "__owner__" ? null : g.key,
      staff_name: g.key === "__owner__" ? "admin/owner" : (names[g.key] ?? "(o'chirilgan)"),
      count: g.count,
      sum_uzs: g.sum,
    }));
    return json({ date, staff, total_uzs: totalSum, total_count: totalCount });
  }

  // ── A3 finance: revenue report by provider + plan for a range (admin) ──
  if (action === "revenue_report") {
    const to = String(body.to ?? "").trim() || new Date().toISOString().slice(0, 10);
    const from = String(body.from ?? "").trim() || new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
    const { data: pays } = await db
      .from("payments")
      .select("amount_uzs, provider, membership_id")
      .eq("status", "paid")
      .gte("paid_at", dayStartUtc(from))
      .lt("paid_at", dayEndUtc(to));

    const payRows = pays ?? [];
    const memIds = new Set<string>();
    for (const p of payRows) if (p.membership_id) memIds.add(p.membership_id);

    // membership_id → plan_id → name_uz
    const memToPlan: Record<string, string> = {};
    const memArr = [...memIds];
    for (let i = 0; i < memArr.length; i += 300) {
      const { data: ms } = await db.from("memberships").select("id, plan_id").in("id", memArr.slice(i, i + 300));
      for (const m of ms ?? []) memToPlan[m.id] = m.plan_id;
    }
    const { data: plans } = await db.from("membership_plans").select("id, name_uz");
    const planName: Record<string, string> = Object.fromEntries((plans ?? []).map((p) => [p.id, p.name_uz]));

    return json({ from, to, ...aggregateRevenue(payRows, memToPlan, planName) });
  }

  // ── A3 finance: refund / cancel a payment (admin/owner) ────────────────
  // Cancels the payment and, if it granted a currently active/frozen membership,
  // cancels that membership too (revokes access). 2-step confirm on the panel.
  // Note: display picks the membership with the latest end_date, so refunding a
  // superseded older payment may not restore an earlier row — refunds target the
  // purchase in question (the common case: the latest one).
  if (action === "payment_refund") {
    const paymentId = String(body.payment_id ?? "").trim();
    if (!isUuid(paymentId)) return json({ error: "payment_id noto'g'ri" }, 400);
    if (await rateLimited(db, auth, "payment_refund", 20, 10)) {
      return json({ error: "Juda ko'p qaytarish urinishi — biroz kuting" }, 429);
    }
    const { data: pay } = await db
      .from("payments")
      .select("id, user_id, status, membership_id, amount_uzs")
      .eq("id", paymentId)
      .maybeSingle();
    if (!pay) return json({ error: "To'lov topilmadi" }, 404);
    if (pay.status !== "paid") return json({ error: "Faqat to'langan to'lovni qaytarish mumkin" }, 400);
    await db.from("payments").update({ status: "cancelled" }).eq("id", pay.id);
    let membershipCancelled = false;
    if (pay.membership_id) {
      const { data: m } = await db.from("memberships").select("id, status").eq("id", pay.membership_id).maybeSingle();
      if (m && (m.status === "active" || m.status === "frozen")) {
        await db.from("memberships").update({ status: "cancelled" }).eq("id", m.id);
        membershipCancelled = true;
      }
    }
    await audit(db, auth, "payment_refund", pay.user_id, {
      payment_id: pay.id,
      amount_uzs: pay.amount_uzs,
      membership_cancelled: membershipCancelled,
    });
    return json({ ok: true, membership_cancelled: membershipCancelled });
  }

  return json({ error: "Unknown action" }, 400);
}

Deno.serve(async (req) => {
  // Reflect the request Origin only if it's a trusted panel (S1). Non-allowed
  // origins get no ACAO header, so a browser on another site can't read replies.
  const origin = allowedOrigin(req.headers.get("origin"));
  const withCors = (res: Response): Response => {
    if (origin) res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    return res;
  };
  if (req.method === "OPTIONS") return withCors(new Response(null, { status: 200, headers: cors }));
  if (req.method === "POST") {
    try {
      return withCors(await handlePost(req));
    } catch (e) {
      return withCors(json({ error: String(e instanceof Error ? e.message : e) }, 500));
    }
  }
  return withCors(json({ ok: true, api: "admin-verify", note: "POST { action, token }" }));
});
