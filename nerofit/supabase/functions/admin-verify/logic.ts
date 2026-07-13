// Pure, DB-free logic for admin-verify (S2). Extracted so the money + status
// math can be unit-tested (logic.test.ts) and guarded by CI — no Supabase, no
// Deno APIs beyond Date. Behavior is identical to the inline code it replaced.

const DAY_MS = 86_400_000;

// Local-day (Uzbekistan, UTC+5) boundaries as UTC ISO — for finance day/range
// filters so "today's cash" matches the gym's wall clock, not UTC midnight.
export function dayStartUtc(d: string): string {
  return new Date(d + "T00:00:00+05:00").toISOString();
}
export function dayEndUtc(d: string): string { // exclusive upper bound (next local day)
  return new Date(new Date(d + "T00:00:00+05:00").getTime() + DAY_MS).toISOString();
}

// Members-list display status from the user's current membership. YYYY-MM-DD
// strings compare lexically, which is correct chronologically.
export type MemberRow = { status: string; end_date: string | null };
export function deriveMemberStatus(m: MemberRow, todayIso: string, in7Iso: string): string {
  if (m.status === "frozen") return "frozen";
  if (m.status === "pending") return "pending";
  if (m.status === "active" && m.end_date && m.end_date >= todayIso) {
    return m.end_date <= in7Iso ? "expiring" : "active";
  }
  return "expired";
}

// membership_extend: new end = later of (current end, today) + days, as YYYY-MM-DD.
// Never extends from the past. `today` is passed in so this stays pure/testable.
export function computeExtendedEnd(currentEnd: string | null, days: number, today: Date): string {
  const base = currentEnd && new Date(currentEnd) >= today ? new Date(currentEnd) : today;
  return new Date(base.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

// ── Plan validation (A4: tariflar) ─────────────────────────────────────────
export type PlanInput = {
  name_uz?: unknown;
  duration_days?: unknown;
  price_app_uzs?: unknown;
  price_gym_uzs?: unknown;
  sort_order?: unknown;
};
export type CleanPlan = {
  name_uz: string;
  duration_days: number;
  price_app_uzs: number;
  price_gym_uzs: number;
  sort_order: number;
};
// Validate + coerce a tariff before it touches the DB. Prices in so'm (integer,
// 0 allowed for a free/promo plan). Returns a discriminated result so callers
// get a typed clean value or a user-facing Uzbek error.
export function validatePlan(
  input: PlanInput,
): { ok: true; value: CleanPlan } | { ok: false; error: string } {
  const name_uz = String(input.name_uz ?? "").trim();
  if (!name_uz) return { ok: false, error: "Nom kerak" };
  if (name_uz.length > 100) return { ok: false, error: "Nom juda uzun (max 100)" };

  const duration_days = Math.floor(Number(input.duration_days));
  if (!Number.isFinite(duration_days) || duration_days < 1 || duration_days > 3650) {
    return { ok: false, error: "Davomiylik 1..3650 kun bo'lishi kerak" };
  }
  const price_app_uzs = Math.floor(Number(input.price_app_uzs));
  if (!Number.isFinite(price_app_uzs) || price_app_uzs < 0 || price_app_uzs > 1_000_000_000) {
    return { ok: false, error: "App narxi 0..1 mlrd so'm bo'lishi kerak" };
  }
  const price_gym_uzs = Math.floor(Number(input.price_gym_uzs));
  if (!Number.isFinite(price_gym_uzs) || price_gym_uzs < 0 || price_gym_uzs > 1_000_000_000) {
    return { ok: false, error: "Zal narxi 0..1 mlrd so'm bo'lishi kerak" };
  }
  const sort_order = Math.floor(Number(input.sort_order ?? 0));
  if (!Number.isFinite(sort_order) || sort_order < 0 || sort_order > 1000) {
    return { ok: false, error: "Tartib 0..1000 bo'lishi kerak" };
  }
  return { ok: true, value: { name_uz, duration_days, price_app_uzs, price_gym_uzs, sort_order } };
}

// ── Content: exercise validation (C1) ──────────────────────────────────────
export type ExerciseInput = {
  title?: unknown;
  target_muscles?: unknown; // string[] or comma-separated string
  default_sets?: unknown;
  default_reps?: unknown;
  image_url?: unknown;
};
export type CleanExercise = {
  title: string;
  target_muscles: string[];
  default_sets: number;
  default_reps: number;
  image_url: string | null;
};
// Normalize target_muscles from an array or a comma string → trimmed, non-empty,
// de-duped, capped list.
export function normalizeMuscles(input: unknown): string[] {
  const raw = Array.isArray(input)
    ? input.map((x) => String(x))
    : String(input ?? "").split(",");
  const out: string[] = [];
  for (const m of raw) {
    const t = m.trim();
    if (t && t.length <= 40 && !out.includes(t)) out.push(t);
    if (out.length >= 10) break;
  }
  return out;
}
export function validateExercise(
  input: ExerciseInput,
): { ok: true; value: CleanExercise } | { ok: false; error: string } {
  const title = String(input.title ?? "").trim();
  if (!title) return { ok: false, error: "Nom kerak" };
  if (title.length > 120) return { ok: false, error: "Nom juda uzun (max 120)" };

  const default_sets = Math.floor(Number(input.default_sets));
  if (!Number.isFinite(default_sets) || default_sets < 1 || default_sets > 20) {
    return { ok: false, error: "Set 1..20 bo'lishi kerak" };
  }
  const default_reps = Math.floor(Number(input.default_reps));
  if (!Number.isFinite(default_reps) || default_reps < 1 || default_reps > 100) {
    return { ok: false, error: "Takror 1..100 bo'lishi kerak" };
  }
  const imageRaw = String(input.image_url ?? "").trim();
  if (imageRaw && !/^https?:\/\//i.test(imageRaw)) {
    return { ok: false, error: "Rasm havolasi http(s):// bilan boshlanishi kerak" };
  }
  if (imageRaw.length > 500) return { ok: false, error: "Rasm havolasi juda uzun" };

  return {
    ok: true,
    value: {
      title,
      target_muscles: normalizeMuscles(input.target_muscles),
      default_sets,
      default_reps,
      image_url: imageRaw || null,
    },
  };
}

// Validate a video URL + optional duration for exercise_video_add.
export function validateVideoUrl(
  url: unknown,
  duration: unknown,
): { ok: true; value: { url: string; duration_sec: number | null } } | { ok: false; error: string } {
  const u = String(url ?? "").trim();
  if (!u) return { ok: false, error: "Video havolasi kerak" };
  if (!/^https?:\/\//i.test(u)) return { ok: false, error: "Havola http(s):// bilan boshlanishi kerak" };
  if (u.length > 1000) return { ok: false, error: "Havola juda uzun" };
  const d = Math.floor(Number(duration));
  const duration_sec = Number.isFinite(d) && d > 0 && d <= 36000 ? d : null;
  return { ok: true, value: { url: u, duration_sec } };
}

// ── Cash reconciliation (cash_report) ──────────────────────────────────────
export type CashRow = { amount_uzs: number | null; activated_by: string | null };
export type CashGroup = { key: string; count: number; sum: number };
// Group manual+paid rows by who took the money. `__owner__` = owner/master
// (activated_by null). Sorted by sum desc — staff names are resolved by caller.
export function aggregateCashByStaff(
  rows: CashRow[],
): { groups: CashGroup[]; totalSum: number; totalCount: number } {
  const byStaff = new Map<string, { count: number; sum: number }>();
  let totalSum = 0, totalCount = 0;
  for (const p of rows) {
    const key = p.activated_by ?? "__owner__";
    const cur = byStaff.get(key) ?? { count: 0, sum: 0 };
    cur.count++; cur.sum += p.amount_uzs || 0;
    byStaff.set(key, cur);
    totalSum += p.amount_uzs || 0; totalCount++;
  }
  const groups = [...byStaff.entries()]
    .map(([key, v]) => ({ key, count: v.count, sum: v.sum }))
    .sort((a, b) => b.sum - a.sum);
  return { groups, totalSum, totalCount };
}

// ── Revenue report (revenue_report) ────────────────────────────────────────
export type RevRow = { amount_uzs: number | null; provider: string | null; membership_id: string | null };
export type RevGroup = { label: string; count: number; sum_uzs: number };
// Totals by provider + by plan for a set of paid rows. memToPlan/planName are
// resolved by the caller (DB); "—" is the fallback bucket.
export function aggregateRevenue(
  rows: RevRow[],
  memToPlan: Record<string, string>,
  planName: Record<string, string>,
): { by_provider: RevGroup[]; by_plan: RevGroup[]; total_uzs: number; total_count: number } {
  const byProv = new Map<string, { count: number; sum: number }>();
  const byPlan = new Map<string, { count: number; sum: number }>();
  let total = 0, cnt = 0;
  for (const p of rows) {
    const pr = p.provider || "—";
    const c = byProv.get(pr) ?? { count: 0, sum: 0 };
    c.count++; c.sum += p.amount_uzs || 0; byProv.set(pr, c);
    const nm = p.membership_id && memToPlan[p.membership_id]
      ? (planName[memToPlan[p.membership_id]] ?? "—")
      : "—";
    const pc = byPlan.get(nm) ?? { count: 0, sum: 0 };
    pc.count++; pc.sum += p.amount_uzs || 0; byPlan.set(nm, pc);
    total += p.amount_uzs || 0; cnt++;
  }
  const asRows = (m: Map<string, { count: number; sum: number }>): RevGroup[] =>
    [...m.entries()]
      .map(([label, v]) => ({ label, count: v.count, sum_uzs: v.sum }))
      .sort((a, b) => b.sum_uzs - a.sum_uzs);
  return { by_provider: asRows(byProv), by_plan: asRows(byPlan), total_uzs: total, total_count: cnt };
}
