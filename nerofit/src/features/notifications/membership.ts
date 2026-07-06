// Local "your membership expires soon" reminder. A one-off notification fired
// EXPIRY_LEAD_DAYS before an active membership's end_date, at EXPIRY_HOUR local
// time. Pure date math so it's unit-testable without the native module — the
// scheduling itself lives in src/lib/notifications.ts.

export const EXPIRY_LEAD_DAYS = 3;
export const EXPIRY_HOUR = 10; // 10:00 local

type ExpiringMembership = { status: string; end_date: string | null } | null | undefined;

// The Date to fire the reminder at, or null when there's nothing to schedule:
// no active membership, no end_date, or the lead-time moment already passed (we
// never schedule a reminder in the past — a frozen membership's clock is paused,
// so status must be "active"). end_date is a plain YYYY-MM-DD calendar day.
export function membershipReminderFireDate(
  m: ExpiringMembership,
  now: Date = new Date(),
): Date | null {
  if (!m || m.status !== "active" || !m.end_date) return null;
  const [y, mo, d] = m.end_date.slice(0, 10).split("-").map(Number);
  if (!y || !mo || !d) return null;
  // Date normalises the day underflow, so subtracting the lead days is safe
  // across month/year boundaries.
  const fire = new Date(y, mo - 1, d - EXPIRY_LEAD_DAYS, EXPIRY_HOUR, 0, 0, 0);
  return fire.getTime() > now.getTime() ? fire : null;
}
