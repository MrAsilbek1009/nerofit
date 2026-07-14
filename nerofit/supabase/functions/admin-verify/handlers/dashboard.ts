import type { Registry } from "../types.ts";
import { json } from "../http.ts";

export const routes: Registry = {
  // All KPIs computed DB-side in one indexed round-trip (migration 0023): no
  // raw-row download, so PostgREST's 1000-row cap can't skew the counts. The RPC
  // returns the exact json shape the panel renders.
  dashboard_stats: {
    role: "admin",
    handler: async ({ db }) => {
      const { data, error } = await db.rpc("admin_dashboard_stats");
      if (error) return json({ error: error.message }, 500);
      return json(data);
    },
  },
  // Time-range revenue series for the Daily/Weekly/Monthly chart toggle
  // (migration 0024). Bucketed DB-side; returns { series: [{ d, v }] }.
  revenue_series: {
    role: "admin",
    handler: async ({ db, body }) => {
      const period = ["day", "week", "month"].includes(String(body.period)) ? String(body.period) : "day";
      const { data, error } = await db.rpc("admin_revenue_series", { period });
      if (error) return json({ error: error.message }, 500);
      return json({ series: data });
    },
  },
  audit_list: {
    role: "admin",
    handler: async ({ db }) => {
      const { data } = await db
        .from("admin_audit")
        .select("id, actor_role, actor_name, action, target, meta, created_at")
        .order("created_at", { ascending: false })
        .limit(60);
      return json({ audit: data ?? [] });
    },
  },
};
