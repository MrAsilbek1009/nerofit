import type { Registry } from "../types.ts";
import { json } from "../http.ts";
import { audit, rateLimited, staffNames } from "../db.ts";
import { isUuid } from "../util.ts";
import { aggregateCashByStaff, aggregateRevenue, dayEndUtc, dayStartUtc } from "../logic.ts";

export const routes: Registry = {
  // Paginated payment journal with provider/status/date filters + name search,
  // plus the filtered total sum (over the whole filter, not just the page).
  payments_list: {
    role: "admin",
    handler: async ({ db, body }) => {
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
    },
  },

  // Daily cash reconciliation per staff. Cash = manual (in-gym) paid activations,
  // grouped by who took the money, for the given local day.
  cash_report: {
    role: "admin",
    handler: async ({ db, body }) => {
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
    },
  },

  // Revenue by provider + plan for a date range.
  revenue_report: {
    role: "admin",
    handler: async ({ db, body }) => {
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
    },
  },

  // Refund / cancel a payment and, if it granted a currently active/frozen
  // membership, cancel that membership too. 2-step confirm on the panel.
  payment_refund: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
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
    },
  },
};
