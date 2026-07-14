import type { SupabaseClient } from "./deps.ts";

// Role hierarchy for the ONE centralized gate (Issue 1 refactor): a route needs
// the actor's rank >= the route's required rank. owner(3) ≥ admin(2) ≥ staff(1).
export type UserRole = "owner" | "admin" | "staff";
export const ROLE_RANK: Record<UserRole, number> = { owner: 3, admin: 2, staff: 1 };

export interface Auth {
  role: UserRole;
  staffId: string | null;
  name: string;
}

export type Body = Record<string, unknown>;

// What every action handler receives. `auth` is guaranteed present — the router
// resolves the session token and checks the role BEFORE dispatch. The two public
// actions (login / logout) are handled separately, outside the registry.
export interface Ctx {
  db: SupabaseClient;
  auth: Auth;
  body: Body;
}

export type Handler = (ctx: Ctx) => Promise<Response>;

// `role` = the minimum role a caller needs. "staff" = any authenticated actor.
export interface Route {
  role: UserRole;
  handler: Handler;
}

export type Registry = Record<string, Route>;
