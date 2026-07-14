import type { Registry } from "../types.ts";
import { json } from "../http.ts";
import { audit } from "../db.ts";
import { isUuid } from "../util.ts";
import { validatePlan } from "../logic.ts";

export const routes: Registry = {
  // Active-only list for the staff picker (kept at staff tier).
  plans: {
    role: "staff",
    handler: async ({ db, auth }) => {
      const { data } = await db
        .from("membership_plans")
        .select("id, name_uz, price_app_uzs, duration_days")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return json({ role: auth.role, plans: data ?? [] });
    },
  },
  // Full list incl. inactive. No hard delete — plans are FK'd by memberships/
  // payments; deactivate (is_active=false) hides a plan instead.
  plan_list_all: {
    role: "admin",
    handler: async ({ db }) => {
      const { data } = await db
        .from("membership_plans")
        .select("id, name_uz, duration_days, price_app_uzs, price_gym_uzs, is_active, sort_order")
        .order("sort_order", { ascending: true })
        .order("name_uz", { ascending: true });
      return json({ plans: data ?? [] });
    },
  },
  plan_create: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const v = validatePlan(body);
      if (!v.ok) return json({ error: v.error }, 400);
      const { data, error } = await db.from("membership_plans").insert(v.value).select("id").single();
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "plan_create", data.id, { name_uz: v.value.name_uz });
      return json({ ok: true, id: data.id });
    },
  },
  plan_update: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const planId = String(body.plan_id ?? "").trim();
      if (!isUuid(planId)) return json({ error: "plan_id noto'g'ri" }, 400);
      const v = validatePlan(body);
      if (!v.ok) return json({ error: v.error }, 400);
      const { error } = await db.from("membership_plans").update(v.value).eq("id", planId);
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "plan_update", planId, { name_uz: v.value.name_uz });
      return json({ ok: true });
    },
  },
  plan_set_active: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const planId = String(body.plan_id ?? "").trim();
      if (!isUuid(planId)) return json({ error: "plan_id noto'g'ri" }, 400);
      const isActive = !!body.is_active;
      const { error } = await db.from("membership_plans").update({ is_active: isActive }).eq("id", planId);
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "plan_set_active", planId, { is_active: isActive });
      return json({ ok: true });
    },
  },
};
