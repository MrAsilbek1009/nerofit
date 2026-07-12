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
