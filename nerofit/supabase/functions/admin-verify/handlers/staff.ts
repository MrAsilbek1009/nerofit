import type { Ctx, Registry } from "../types.ts";
import { json } from "../http.ts";
import { audit, rateLimited } from "../db.ts";
import { hashPw, isUuid } from "../util.ts";

// staff_add + staff_set_password share a body; one function, two registry keys.
const staffPassword = (mode: "add" | "set") => async ({ db, auth, body }: Ctx): Promise<Response> => {
  const pw = String(body.new_password ?? "").trim();
  if (!pw) return json({ error: "new_password required" }, 400);
  const hash = await hashPw(pw);
  if (mode === "add") {
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
};

export const routes: Registry = {
  staff_list: {
    role: "admin",
    handler: async ({ db }) => {
      const { data } = await db
        .from("gym_staff")
        .select("id, name, role, is_active, created_at")
        .order("created_at", { ascending: true });
      return json({ staff: data ?? [] });
    },
  },
  staff_add: { role: "admin", handler: staffPassword("add") },
  staff_set_password: { role: "admin", handler: staffPassword("set") },
  staff_set_active: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const staffId = String(body.staff_id ?? "").trim();
      await db.from("gym_staff").update({ is_active: !!body.is_active }).eq("id", staffId);
      await audit(db, auth, "staff_set_active", staffId, { is_active: !!body.is_active });
      return json({ ok: true });
    },
  },
  staff_delete: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const staffId = String(body.staff_id ?? "").trim();
      if (!isUuid(staffId)) return json({ error: "staff_id noto'g'ri" }, 400);
      if (await rateLimited(db, auth, "staff_delete", 10, 10)) {
        return json({ error: "Juda ko'p urinish — biroz kuting" }, 429);
      }
      await db.from("gym_staff").delete().eq("id", staffId);
      await audit(db, auth, "staff_delete", staffId, {});
      return json({ ok: true });
    },
  },
  admin_set_password: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
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
    },
  },
};
