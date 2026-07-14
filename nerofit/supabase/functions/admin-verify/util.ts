import type { SupabaseClient } from "./deps.ts";

export const SESSION_TTL_MS = 8 * 3_600_000; // 8h (S1), slid forward on activity

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);

export function today(): Date {
  return new Date(new Date().toDateString());
}
export function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000));
}
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000));
}
export function getIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}
export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function newToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Stacking base: a new period starts from the later of (current active end, today)
// so buying again while still a member extends rather than overwrites.
export async function stackBase(db: SupabaseClient, userId: string): Promise<Date> {
  const { data } = await db
    .from("memberships")
    .select("end_date")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("end_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (data?.end_date && new Date(data.end_date) >= today()) return new Date(data.end_date);
  return today();
}

// SHA-256(pepper + ":" + password), hex. Pepper = service-role key (secret).
export async function hashPw(pw: string): Promise<string> {
  const pepper = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return await sha256Hex(pepper + ":" + pw);
}
