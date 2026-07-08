import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Food moderation API (Phase 16 · N1.1). Lets an admin/staff review community-
// submitted foods and publish them (is_verified=true) or remove them. Same
// password auth as admin-verify: the ADMIN_PANEL_PASSWORD master secret, or a
// row in gym_staff (SHA-256 hashed with the service-role key as pepper).
//
// Static panel (docs/food-admin, hosted on Vercel) POSTs { password, action }.
// Deploy with `--no-verify-jwt` (public; password is the boundary). Uses the
// service role, so it bypasses RLS to flip is_verified (users can't self-verify).

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
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// SHA-256(service_role_key + ":" + password) — matches admin-verify so the same
// staff passwords work here.
async function hashPw(pw: string): Promise<string> {
  const pepper = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(pepper + ":" + pw),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Auth = { role: "admin" | "staff"; name: string };
async function authenticate(db: SupabaseClient, password: string): Promise<Auth | null> {
  const master = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (master && password === master) return { role: "admin", name: "admin" };
  if (!password) return null;
  const { data } = await db
    .from("gym_staff")
    .select("name, role, is_active")
    .eq("password_hash", await hashPw(password))
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  return { role: data.role as "admin" | "staff", name: data.name };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const { password, action } = body as { password?: string; action?: string };

    const db = admin();
    const auth = await authenticate(db, password ?? "");
    if (!auth) return json({ error: "unauthorized" }, 401);

    if (action === "session") {
      return json({ ok: true, role: auth.role, name: auth.name });
    }

    if (action === "list_pending") {
      const { data, error } = await db
        .from("foods")
        .select("id, name, brand, kcal, protein_g, carbs_g, fats_g, serving_label, created_at")
        .eq("source", "community")
        .eq("is_verified", false)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, foods: data ?? [] });
    }

    if (action === "verify") {
      const { food_id } = body as { food_id?: string };
      if (!food_id) return json({ error: "food_id required" }, 400);
      const { error } = await db.from("foods").update({ is_verified: true }).eq("id", food_id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "reject") {
      const { food_id } = body as { food_id?: string };
      if (!food_id) return json({ error: "food_id required" }, 400);
      // Only ever delete community rows — never touch the verified seed.
      const { error } = await db
        .from("foods")
        .delete()
        .eq("id", food_id)
        .eq("source", "community");
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
