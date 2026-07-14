import type { Registry } from "../types.ts";
import { json } from "../http.ts";
import { audit, staffNames } from "../db.ts";
import { daysBetween, daysLeft, isUuid, stackBase, today } from "../util.ts";
import { computeExtendedEnd, deriveMemberStatus } from "../logic.ts";

export const routes: Registry = {
  // ── staff-tier: QR verify + cash activation + order + freeze ──────────────
  verify: {
    role: "staff",
    handler: async ({ db, auth, body }) => {
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
    },
  },

  activate: {
    role: "staff",
    handler: async ({ db, auth, body }) => {
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
    },
  },

  // ── cash order (Variant A) ────────────────────────────────────────────────
  order_detail: {
    role: "staff",
    handler: async ({ db, body }) => {
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
    },
  },

  order_activate: {
    role: "staff",
    handler: async ({ db, auth, body }) => {
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
    },
  },

  freeze: {
    role: "staff",
    handler: async ({ db, auth, body }) => {
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
        .update({ status: "frozen", frozen_at: today().toISOString().slice(0, 10) })
        .eq("id", m.id);
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "freeze", userId, {});
      return json({ ok: true, status: "frozen", days_left: daysLeft(m.end_date) });
    },
  },

  unfreeze: {
    role: "staff",
    handler: async ({ db, auth, body }) => {
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
      const frozenDays = daysBetween(m.frozen_at, today().toISOString().slice(0, 10));
      const newEnd = new Date(new Date(m.end_date).getTime() + frozenDays * 86_400_000).toISOString().slice(0, 10);
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
    },
  },

  // ── admin-tier: search + detail + list + notes + extend + activity ────────
  members_search: {
    role: "admin",
    handler: async ({ db, body }) => {
      const q = String(body.q ?? "").trim();
      if (!q) return json({ members: [] });
      const { data } = await db.from("profiles").select("id, name").ilike("name", `%${q}%`).limit(25);
      return json({ members: data ?? [] });
    },
  },

  member_detail: {
    role: "admin",
    handler: async ({ db, body }) => {
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
      const { data: mt } = await db
        .from("member_trainers")
        .select("trainer_id, trainers(name)")
        .eq("user_id", userId)
        .maybeSingle();
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
        // deno-lint-ignore no-explicit-any
        trainer: mt ? { id: mt.trainer_id, name: (mt as any).trainers?.name ?? null } : null,
      });
    },
  },

  // Reduces the memberships table to the CURRENT membership per user, derives a
  // display status, then filters/sorts/paginates. Single-gym scale — if the
  // memberships table ever grows huge, move this to a DB view / RPC.
  members_list: {
    role: "admin",
    handler: async ({ db, body }) => {
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
    },
  },

  member_note_add: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
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
    },
  },

  // Manual comp / correction (no payment). Base = later of current end and today
  // so we never extend from the past. Reactivates an expired period; frozen stays
  // frozen (the extra days apply once it thaws).
  membership_extend: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
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
    },
  },

  checkins_recent: {
    role: "admin",
    handler: async ({ db }) => {
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
    },
  },
};
