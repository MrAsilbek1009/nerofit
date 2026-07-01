import { describe, expect, it } from "@jest/globals";
import {
  buildReminderRequests,
  DEFAULT_TIMES,
  type ReminderPrefs,
  type ReminderTexts,
} from "./notifications";

const texts: ReminderTexts = {
  supplements: { title: "s", body: "sb" },
  water: { title: "w", body: "wb" },
  workout: { title: "o", body: "ob" },
  streak: { title: "k", body: "kb" },
};

function allOff(): ReminderPrefs {
  return {
    supplements: { enabled: false, ...DEFAULT_TIMES.supplements },
    water: { enabled: false, ...DEFAULT_TIMES.water },
    workout: { enabled: false, ...DEFAULT_TIMES.workout },
    streak: { enabled: false, ...DEFAULT_TIMES.streak },
  };
}

describe("buildReminderRequests", () => {
  it("returns nothing when every reminder is disabled", () => {
    expect(buildReminderRequests(allOff(), texts)).toEqual([]);
  });

  it("includes only enabled reminders with their time and copy", () => {
    const prefs = allOff();
    prefs.water.enabled = true;
    prefs.water.hour = 8;
    prefs.streak.enabled = true;

    const reqs = buildReminderRequests(prefs, texts);
    expect(reqs.map((r) => r.id)).toEqual(["water", "streak"]);

    const water = reqs.find((r) => r.id === "water")!;
    expect(water.hour).toBe(8);
    expect(water.content.body).toBe("wb");

    const streak = reqs.find((r) => r.id === "streak")!;
    expect(streak.hour).toBe(DEFAULT_TIMES.streak.hour);
  });

  it("keeps the canonical reminder order regardless of which are on", () => {
    const prefs = allOff();
    prefs.streak.enabled = true;
    prefs.supplements.enabled = true;
    expect(buildReminderRequests(prefs, texts).map((r) => r.id)).toEqual([
      "supplements",
      "streak",
    ]);
  });
});
