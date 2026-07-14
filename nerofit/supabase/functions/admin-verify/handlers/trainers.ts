import type { Registry } from "../types.ts";
import { json } from "../http.ts";
import { audit } from "../db.ts";
import { isUuid } from "../util.ts";
import { validateTrainer } from "../logic.ts";

export const routes: Registry = {
  trainer_list: {
    role: "admin",
    handler: async ({ db }) => {
      const { data } = await db
        .from("trainers")
        .select("id, name, specialization, bio, photo_url, is_active, created_at")
        .order("is_active", { ascending: false })
        .order("name", { ascending: true });
      const { data: assigns } = await db.from("member_trainers").select("trainer_id");
      const counts: Record<string, number> = {};
      for (const a of assigns ?? []) counts[a.trainer_id] = (counts[a.trainer_id] ?? 0) + 1;
      return json({ trainers: (data ?? []).map((t) => ({ ...t, member_count: counts[t.id] ?? 0 })) });
    },
  },
  trainer_create: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const v = validateTrainer(body);
      if (!v.ok) return json({ error: v.error }, 400);
      const { data, error } = await db.from("trainers").insert(v.value).select("id").single();
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "trainer_create", data.id, { name: v.value.name });
      return json({ ok: true, id: data.id });
    },
  },
  trainer_update: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const id = String(body.trainer_id ?? "").trim();
      if (!isUuid(id)) return json({ error: "trainer_id noto'g'ri" }, 400);
      const v = validateTrainer(body);
      if (!v.ok) return json({ error: v.error }, 400);
      const { error } = await db.from("trainers").update(v.value).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "trainer_update", id, { name: v.value.name });
      return json({ ok: true });
    },
  },
  trainer_set_active: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const id = String(body.trainer_id ?? "").trim();
      if (!isUuid(id)) return json({ error: "trainer_id noto'g'ri" }, 400);
      const isActive = !!body.is_active;
      const { error } = await db.from("trainers").update({ is_active: isActive }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "trainer_set_active", id, { is_active: isActive });
      return json({ ok: true });
    },
  },
  // Assign (upsert) or clear (empty trainer_id) a member's trainer.
  member_assign_trainer: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const userId = String(body.user_id ?? "").trim();
      if (!isUuid(userId)) return json({ error: "user_id noto'g'ri" }, 400);
      const trainerId = String(body.trainer_id ?? "").trim();
      if (!trainerId) {
        await db.from("member_trainers").delete().eq("user_id", userId);
        await audit(db, auth, "member_assign_trainer", userId, { trainer_id: null });
        return json({ ok: true, trainer_id: null });
      }
      if (!isUuid(trainerId)) return json({ error: "trainer_id noto'g'ri" }, 400);
      const { error } = await db
        .from("member_trainers")
        .upsert({ user_id: userId, trainer_id: trainerId, assigned_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "member_assign_trainer", userId, { trainer_id: trainerId });
      return json({ ok: true, trainer_id: trainerId });
    },
  },
};
