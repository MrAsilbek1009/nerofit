import { describe, expect, it } from "@jest/globals";
import {
  EXPIRY_HOUR,
  EXPIRY_LEAD_DAYS,
  membershipReminderFireDate,
} from "./membership";

describe("membershipReminderFireDate", () => {
  const now = new Date(2026, 0, 1, 12, 0, 0); // 2026-01-01 12:00 local

  it("returns null when there is no membership", () => {
    expect(membershipReminderFireDate(null, now)).toBeNull();
    expect(membershipReminderFireDate(undefined, now)).toBeNull();
  });

  it("returns null unless the membership is active", () => {
    for (const status of ["pending", "frozen", "expired", "cancelled"]) {
      expect(
        membershipReminderFireDate({ status, end_date: "2026-03-01" }, now),
      ).toBeNull();
    }
  });

  it("returns null when end_date is missing or malformed", () => {
    expect(membershipReminderFireDate({ status: "active", end_date: null }, now)).toBeNull();
    expect(membershipReminderFireDate({ status: "active", end_date: "not-a-date" }, now)).toBeNull();
  });

  it("fires LEAD_DAYS before end_date at EXPIRY_HOUR local time", () => {
    const fire = membershipReminderFireDate({ status: "active", end_date: "2026-02-10" }, now);
    expect(fire).not.toBeNull();
    // 2026-02-10 minus 3 days = 2026-02-07 at 10:00
    expect(fire!.getFullYear()).toBe(2026);
    expect(fire!.getMonth()).toBe(1); // February (0-based)
    expect(fire!.getDate()).toBe(10 - EXPIRY_LEAD_DAYS);
    expect(fire!.getHours()).toBe(EXPIRY_HOUR);
  });

  it("handles month boundaries when subtracting the lead days", () => {
    const fire = membershipReminderFireDate({ status: "active", end_date: "2026-03-02" }, now);
    // 2026-03-02 minus 3 days = 2026-02-27
    expect(fire!.getMonth()).toBe(1);
    expect(fire!.getDate()).toBe(27);
  });

  it("returns null when the lead-time moment already passed", () => {
    const soon = new Date(2026, 1, 6, 12, 0, 0); // 2026-02-06 12:00
    // end_date 2026-02-07 → fire would be 2026-02-04, already in the past
    expect(membershipReminderFireDate({ status: "active", end_date: "2026-02-07" }, soon)).toBeNull();
  });
});
