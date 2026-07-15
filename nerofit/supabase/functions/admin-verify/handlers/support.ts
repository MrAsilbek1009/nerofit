import type { Registry } from "../types.ts";
import { json } from "../http.ts";
import { audit } from "../db.ts";
import { isUuid } from "../util.ts";
import { validateTicket } from "../logic.ts";

const STATUSES = ["open", "pending", "resolved", "closed"];

export const routes: Registry = {
  // Paginated ticket list, filterable by status + priority, with member names.
  support_list: {
    role: "admin",
    handler: async ({ db, body }) => {
      const status = String(body.status ?? "all");
      const priority = String(body.priority ?? "all");
      const limit = Math.min(100, Math.max(1, Math.floor(Number(body.limit) || 25)));
      const offset = Math.max(0, Math.floor(Number(body.offset) || 0));

      let query = db
        .from("support_tickets")
        .select("id, user_id, subject, status, priority, last_reply_at, created_at", { count: "exact" });
      if (STATUSES.includes(status)) query = query.eq("status", status);
      if (["low", "normal", "high", "urgent"].includes(priority)) query = query.eq("priority", priority);
      const { data, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      const rows = data ?? [];
      const uids = [...new Set(rows.map((t) => t.user_id).filter(Boolean))] as string[];
      const names: Record<string, string | null> = {};
      if (uids.length) {
        const { data: profs } = await db.from("profiles").select("id, name").in("id", uids);
        for (const p of profs ?? []) names[p.id] = p.name;
      }
      return json({
        tickets: rows.map((t) => ({ ...t, member_name: t.user_id ? names[t.user_id] ?? null : null })),
        total: count ?? 0,
        limit,
        offset,
      });
    },
  },

  // One ticket + its full message thread (ascending).
  support_detail: {
    role: "admin",
    handler: async ({ db, body }) => {
      const id = String(body.ticket_id ?? "").trim();
      if (!isUuid(id)) return json({ error: "ticket_id noto'g'ri" }, 400);
      const { data: t } = await db
        .from("support_tickets")
        .select("id, user_id, subject, status, priority, created_at")
        .eq("id", id)
        .maybeSingle();
      if (!t) return json({ found: false });
      const { data: msgs } = await db
        .from("support_ticket_messages")
        .select("author_kind, author_name, body, created_at")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });
      let memberName: string | null = null;
      if (t.user_id) {
        const { data: p } = await db.from("profiles").select("name").eq("id", t.user_id).maybeSingle();
        memberName = p?.name ?? null;
      }
      return json({ found: true, ticket: { ...t, member_name: memberName }, messages: msgs ?? [] });
    },
  },

  // Log a ticket (staff records a member issue). The initial body becomes the
  // first thread message, attributed to the member. Optional user_id links it.
  support_create: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const v = validateTicket(body);
      if (!v.ok) return json({ error: v.error }, 400);
      const userIdRaw = String(body.user_id ?? "").trim();
      const uid = isUuid(userIdRaw) ? userIdRaw : null;
      let memberName = "A'zo";
      if (uid) {
        const { data: p } = await db.from("profiles").select("name").eq("id", uid).maybeSingle();
        memberName = p?.name ?? "A'zo";
      }
      const now = new Date().toISOString();
      const { data: t, error } = await db
        .from("support_tickets")
        .insert({ user_id: uid, subject: v.value.subject, priority: v.value.priority, created_by_staff: auth.staffId, last_reply_at: now })
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 500);
      await db.from("support_ticket_messages").insert({
        ticket_id: t.id, author_kind: "member", author_name: memberName, body: v.value.body,
      });
      await audit(db, auth, "support_create", t.id, { subject: v.value.subject });
      return json({ ok: true, id: t.id });
    },
  },

  // Staff reply → appends a 'staff' message + bumps the ticket timestamps.
  support_reply: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const id = String(body.ticket_id ?? "").trim();
      if (!isUuid(id)) return json({ error: "ticket_id noto'g'ri" }, 400);
      const msg = String(body.body ?? "").trim();
      if (!msg) return json({ error: "Xabar kerak" }, 400);
      if (msg.length > 2000) return json({ error: "Xabar juda uzun (max 2000)" }, 400);
      const { error } = await db.from("support_ticket_messages").insert({
        ticket_id: id, author_kind: "staff", author_staff_id: auth.staffId, author_name: auth.name, body: msg,
      });
      if (error) return json({ error: error.message }, 500);
      const now = new Date().toISOString();
      await db.from("support_tickets").update({ last_reply_at: now, updated_at: now }).eq("id", id);
      await audit(db, auth, "support_reply", id, {});
      return json({ ok: true });
    },
  },

  support_set_status: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const id = String(body.ticket_id ?? "").trim();
      if (!isUuid(id)) return json({ error: "ticket_id noto'g'ri" }, 400);
      const status = String(body.status ?? "");
      if (!STATUSES.includes(status)) return json({ error: "Holat noto'g'ri" }, 400);
      const { error } = await db.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "support_set_status", id, { status });
      return json({ ok: true });
    },
  },
};
