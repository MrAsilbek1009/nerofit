import type { SupabaseClient } from "./deps.ts";
import type { Auth } from "./types.ts";
import { hashPw, sha256Hex, SESSION_TTL_MS } from "./util.ts";

// Password → Auth (login only). Master ADMIN_PANEL_PASSWORD = owner; otherwise a
// matching active gym_staff row (admin | staff).
export async function authenticate(db: SupabaseClient, password: string): Promise<Auth | null> {
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

// Resolve a session token → Auth, or null if unknown/expired. Sliding session:
// each active request pushes expiry out, so an idle session dies after
// SESSION_TTL_MS but an in-use one stays alive.
export async function authByToken(db: SupabaseClient, token: string): Promise<Auth | null> {
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
  const now = new Date();
  await db.from("admin_sessions").update({
    last_seen: now.toISOString(),
    expires_at: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  }).eq("token_hash", th);
  return { role: data.role as Auth["role"], staffId: data.staff_id, name: data.name };
}
