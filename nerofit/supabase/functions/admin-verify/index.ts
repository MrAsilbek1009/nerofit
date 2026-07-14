// Admin / staff membership API — thin router (Issue 1 refactor).
//
// One POST endpoint. The body is `{ action, token, ...params }`; `action` is
// dispatched through a registry composed from handlers/*.ts. Each route declares
// the minimum role it needs; the gate is checked HERE, once, not in every handler.
//
// Auth (A0/S1 security foundation):
//   • `login { password }` → a short-lived session TOKEN (8h). The token is what
//     panels send on every subsequent request — the password travels only once.
//   • Every other action needs a valid `{ token }`. Roles: owner (master
//     ADMIN_PANEL_PASSWORD) · admin · staff, ranked in types.ts (ROLE_RANK).
//   • Every mutating handler writes to `admin_audit` (who/what/when).
//
// Passwords are SHA-256-hashed with the service-role key as a pepper. The
// admin_sessions / admin_audit / gym_staff tables are service-role-only.
// Deploy with `--no-verify-jwt` (public; the token/password is the boundary).

import { admin } from "./db.ts";
import { allowedOrigin, cors, json } from "./http.ts";
import { authByToken } from "./auth.ts";
import { ROLE_RANK, type Registry } from "./types.ts";
import { handleLogin, handleLogout, routes as authRoutes } from "./handlers/auth.ts";
import { routes as staffRoutes } from "./handlers/staff.ts";
import { routes as memberRoutes } from "./handlers/members.ts";
import { routes as planRoutes } from "./handlers/plans.ts";
import { routes as contentRoutes } from "./handlers/content.ts";
import { routes as trainerRoutes } from "./handlers/trainers.ts";
import { routes as financeRoutes } from "./handlers/finance.ts";
import { routes as dashboardRoutes } from "./handlers/dashboard.ts";

const registry: Registry = {
  ...authRoutes,
  ...staffRoutes,
  ...memberRoutes,
  ...planRoutes,
  ...contentRoutes,
  ...trainerRoutes,
  ...financeRoutes,
  ...dashboardRoutes,
};

async function handlePost(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const db = admin();
  const action = String(body.action ?? "");

  // Public (no session yet): login issues a token, logout drops one.
  if (action === "login") return handleLogin(db, body, req);
  if (action === "logout") return handleLogout(db, body);

  // Every other action needs a valid session token.
  const auth = await authByToken(db, String(body.token ?? ""));
  if (!auth) return json({ error: "Sessiya tugagan — qayta kiring" }, 401);

  const route = registry[action];
  if (!route) return json({ error: "Unknown action" }, 400);

  // The ONE centralized role gate (Issue 1): rank must clear the route's minimum.
  if (ROLE_RANK[auth.role] < ROLE_RANK[route.role]) return json({ error: "Admin only" }, 403);

  return route.handler({ db, auth, body });
}

Deno.serve(async (req) => {
  // Reflect the request Origin only if it's a trusted panel (S1). Non-allowed
  // origins get no ACAO header, so a browser on another site can't read replies.
  const origin = allowedOrigin(req.headers.get("origin"));
  const withCors = (res: Response): Response => {
    if (origin) res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    return res;
  };
  if (req.method === "OPTIONS") return withCors(new Response(null, { status: 200, headers: cors }));
  if (req.method === "POST") {
    try {
      return withCors(await handlePost(req));
    } catch (e) {
      return withCors(json({ error: String(e instanceof Error ? e.message : e) }, 500));
    }
  }
  return withCors(json({ ok: true, api: "admin-verify", note: "POST { action, token }" }));
});
