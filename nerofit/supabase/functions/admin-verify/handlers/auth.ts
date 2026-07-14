import type { SupabaseClient } from "../deps.ts";
import type { Body, Registry } from "../types.ts";
import { json } from "../http.ts";
import { audit } from "../db.ts";
import { authenticate } from "../auth.ts";
import { getIp, newToken, sha256Hex, SESSION_TTL_MS } from "../util.ts";

// login + logout are PUBLIC (no session yet) → the router calls these directly,
// before token resolution. They live here for cohesion with logout_all/session.

// password → session token (rate-limited per IP).
export async function handleLogin(db: SupabaseClient, body: Body, req: Request): Promise<Response> {
  const ip = getIp(req);
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: fails } = await db
    .from("admin_audit")
    .select("meta")
    .eq("action", "login_failed")
    .gte("created_at", since);
  // deno-lint-ignore no-explicit-any
  const recent = (fails ?? []).filter((r) => (r.meta as any)?.ip === ip).length;
  if (recent >= 8) return json({ error: "Juda ko'p urinish. 15 daqiqadan so'ng qayta urining." }, 429);

  const a = await authenticate(db, String(body.password ?? ""));
  if (!a) {
    await audit(db, null, "login_failed", null, { ip });
    return json({ error: "Parol noto'g'ri" }, 401);
  }
  const token = newToken();
  const { error: sErr } = await db.from("admin_sessions").insert({
    token_hash: await sha256Hex(token),
    staff_id: a.staffId,
    role: a.role,
    name: a.name,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  // Don't hand back a token we couldn't store (e.g. migration 0020 not applied).
  if (sErr) return json({ error: "Sessiya saqlanmadi — migration 0020 qo'llanganmi?" }, 500);
  await audit(db, a, "login", null, { ip });
  return json({ ok: true, token, role: a.role, name: a.name });
}

// drop the token (no auth needed).
export async function handleLogout(db: SupabaseClient, body: Body): Promise<Response> {
  const token = String(body.token ?? "");
  if (token) await db.from("admin_sessions").delete().eq("token_hash", await sha256Hex(token));
  return json({ ok: true });
}

export const routes: Registry = {
  // logout_all: drop every session for this actor (chiqish — barcha qurilmadan).
  logout_all: {
    role: "staff",
    handler: async ({ db, auth }) => {
      if (auth.staffId) await db.from("admin_sessions").delete().eq("staff_id", auth.staffId);
      else await db.from("admin_sessions").delete().is("staff_id", null); // owner/master
      await audit(db, auth, "logout_all", null, {});
      return json({ ok: true });
    },
  },
  session: {
    role: "staff",
    handler: ({ auth }) => Promise.resolve(json({ role: auth.role, name: auth.name })),
  },
};
