import type { Registry } from "../types.ts";
import { json } from "../http.ts";
import { audit } from "../db.ts";
import { isUuid } from "../util.ts";
import { validateExercise, validateVideoUrl } from "../logic.ts";

export const routes: Registry = {
  exercise_list: {
    role: "admin",
    handler: async ({ db }) => {
      const { data } = await db
        .from("exercises")
        .select("id, title, target_muscles, default_sets, default_reps, image_url, exercise_videos(id, url, duration_sec, provider)")
        .order("title", { ascending: true });
      return json({ exercises: data ?? [] });
    },
  },
  exercise_create: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const v = validateExercise(body);
      if (!v.ok) return json({ error: v.error }, 400);
      const { data, error } = await db.from("exercises").insert(v.value).select("id").single();
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "exercise_create", data.id, { title: v.value.title });
      return json({ ok: true, id: data.id });
    },
  },
  exercise_update: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const id = String(body.exercise_id ?? "").trim();
      if (!isUuid(id)) return json({ error: "exercise_id noto'g'ri" }, 400);
      const v = validateExercise(body);
      if (!v.ok) return json({ error: v.error }, 400);
      const { error } = await db.from("exercises").update(v.value).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "exercise_update", id, { title: v.value.title });
      return json({ ok: true });
    },
  },
  // Guarded delete — never destroy an exercise that's used in a workout or has
  // user history (exercise_logs). Its videos cascade-delete with it.
  exercise_delete: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
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
    },
  },
  exercise_video_add: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const id = String(body.exercise_id ?? "").trim();
      if (!isUuid(id)) return json({ error: "exercise_id noto'g'ri" }, 400);
      const v = validateVideoUrl(body.url, body.duration_sec);
      if (!v.ok) return json({ error: v.error }, 400);
      const provider = (String(body.provider ?? "").trim().slice(0, 30)) || "url";
      const { error } = await db.from("exercise_videos").insert({ exercise_id: id, url: v.value.url, duration_sec: v.value.duration_sec, provider });
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "exercise_video_add", id, {});
      return json({ ok: true });
    },
  },
  exercise_video_delete: {
    role: "admin",
    handler: async ({ db, auth, body }) => {
      const videoId = String(body.video_id ?? "").trim();
      if (!isUuid(videoId)) return json({ error: "video_id noto'g'ri" }, 400);
      const { error } = await db.from("exercise_videos").delete().eq("id", videoId);
      if (error) return json({ error: error.message }, 500);
      await audit(db, auth, "exercise_video_delete", videoId, {});
      return json({ ok: true });
    },
  },
};
