// Unit tests for the pure money/status logic (S2). Self-contained — no remote
// imports — so `deno test` runs offline and fast in CI. Run: `deno test`.
import {
  aggregateCashByStaff,
  aggregateRevenue,
  computeExtendedEnd,
  dayEndUtc,
  dayStartUtc,
  deriveMemberStatus,
} from "./logic.ts";

function assertEquals(actual: unknown, expected: unknown, msg?: string): void {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg ?? "assertEquals"}: got ${a}, want ${e}`);
}

const TODAY = "2026-07-13";
const IN7 = "2026-07-20";

Deno.test("deriveMemberStatus — frozen/pending win first", () => {
  assertEquals(deriveMemberStatus({ status: "frozen", end_date: "2026-08-01" }, TODAY, IN7), "frozen");
  assertEquals(deriveMemberStatus({ status: "pending", end_date: null }, TODAY, IN7), "pending");
});

Deno.test("deriveMemberStatus — active window", () => {
  assertEquals(deriveMemberStatus({ status: "active", end_date: "2026-08-01" }, TODAY, IN7), "active");
  assertEquals(deriveMemberStatus({ status: "active", end_date: "2026-07-15" }, TODAY, IN7), "expiring");
  assertEquals(deriveMemberStatus({ status: "active", end_date: TODAY }, TODAY, IN7), "expiring", "expires today = expiring");
  assertEquals(deriveMemberStatus({ status: "active", end_date: IN7 }, TODAY, IN7), "expiring", "day 7 inclusive");
});

Deno.test("deriveMemberStatus — expired paths", () => {
  assertEquals(deriveMemberStatus({ status: "active", end_date: "2026-07-10" }, TODAY, IN7), "expired", "active but past");
  assertEquals(deriveMemberStatus({ status: "active", end_date: null }, TODAY, IN7), "expired", "active but no end");
  assertEquals(deriveMemberStatus({ status: "expired", end_date: "2026-06-01" }, TODAY, IN7), "expired");
  assertEquals(deriveMemberStatus({ status: "cancelled", end_date: "2026-09-01" }, TODAY, IN7), "expired", "cancelled falls through");
});

Deno.test("computeExtendedEnd — extends from later of end/today", () => {
  const today = new Date("2026-07-13T00:00:00.000Z");
  assertEquals(computeExtendedEnd("2026-08-01", 7, today), "2026-08-08", "future end → from end");
  assertEquals(computeExtendedEnd("2026-07-01", 7, today), "2026-07-20", "past end → from today");
  assertEquals(computeExtendedEnd(null, 10, today), "2026-07-23", "no end → from today");
  assertEquals(computeExtendedEnd("2026-07-13", 1, today), "2026-07-14", "end == today");
});

Deno.test("dayStartUtc / dayEndUtc — UTC+5 local day boundaries", () => {
  assertEquals(dayStartUtc("2026-07-13"), "2026-07-12T19:00:00.000Z", "local midnight = 19:00 UTC prev day");
  assertEquals(dayEndUtc("2026-07-13"), "2026-07-13T19:00:00.000Z", "exclusive next-day boundary");
});

Deno.test("aggregateCashByStaff — groups, owner bucket, null amount, sort", () => {
  const { groups, totalSum, totalCount } = aggregateCashByStaff([
    { amount_uzs: 250000, activated_by: "s1" },
    { amount_uzs: 250000, activated_by: "s1" },
    { amount_uzs: 1000000, activated_by: null }, // owner
    { amount_uzs: null, activated_by: "s2" }, // null → 0
  ]);
  assertEquals(groups, [
    { key: "__owner__", count: 1, sum: 1000000 },
    { key: "s1", count: 2, sum: 500000 },
    { key: "s2", count: 1, sum: 0 },
  ], "sorted by sum desc; null amount counts as 0");
  assertEquals(totalSum, 1500000);
  assertEquals(totalCount, 4);
});

Deno.test("aggregateCashByStaff — empty", () => {
  assertEquals(aggregateCashByStaff([]), { groups: [], totalSum: 0, totalCount: 0 });
});

Deno.test("aggregateRevenue — by provider + plan, fallbacks, totals", () => {
  const agg = aggregateRevenue(
    [
      { amount_uzs: 1250000, provider: "payme", membership_id: "m1" },
      { amount_uzs: 250000, provider: "manual", membership_id: "m2" },
      { amount_uzs: 250000, provider: null, membership_id: null }, // provider & plan "—"
    ],
    { m1: "p1", m2: "p1" },
    { p1: "Yillik" },
  );
  assertEquals(agg.by_provider, [
    { label: "payme", count: 1, sum_uzs: 1250000 },
    { label: "manual", count: 1, sum_uzs: 250000 },
    { label: "—", count: 1, sum_uzs: 250000 },
  ]);
  assertEquals(agg.by_plan, [
    { label: "Yillik", count: 2, sum_uzs: 1500000 },
    { label: "—", count: 1, sum_uzs: 250000 },
  ]);
  assertEquals(agg.total_uzs, 1750000);
  assertEquals(agg.total_count, 3);
});
