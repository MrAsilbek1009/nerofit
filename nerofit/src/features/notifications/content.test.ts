import { describe, expect, it } from "@jest/globals";
import { buildReminderTexts, dayOfYear, reminderBodyKey, type Translate } from "./content";

// Stub translate: echoes the key, and appends the streak count when interpolated
// so tests can assert both key selection and interpolation.
const translate: Translate = (key, options) =>
  options && "count" in options ? `${key}#${String(options.count)}` : key;

describe("dayOfYear", () => {
  it("is 1 on Jan 1 and 32 on Feb 1", () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
    expect(dayOfYear(new Date(2026, 1, 1))).toBe(32);
  });
});

describe("reminderBodyKey", () => {
  it("picks the none key when there is no streak and active otherwise", () => {
    expect(reminderBodyKey("streak", { streak: 0, day: 5 })).toBe(
      "reminders.streak.body.none",
    );
    expect(reminderBodyKey("streak", { streak: 3, day: 5 })).toBe(
      "reminders.streak.body.active",
    );
  });

  it("uses the single body key for reminders without variants", () => {
    expect(reminderBodyKey("supplements", { streak: 0, day: 1 })).toBe(
      "reminders.supplements.body",
    );
  });

  it("rotates water/workout between body and body2 by day parity", () => {
    expect(reminderBodyKey("water", { streak: 0, day: 2 })).toBe("reminders.water.body");
    expect(reminderBodyKey("water", { streak: 0, day: 3 })).toBe("reminders.water.body2");
    expect(reminderBodyKey("workout", { streak: 0, day: 4 })).toBe(
      "reminders.workout.body",
    );
    expect(reminderBodyKey("workout", { streak: 0, day: 5 })).toBe(
      "reminders.workout.body2",
    );
  });
});

describe("buildReminderTexts", () => {
  it("builds title + body for every reminder and interpolates the streak count", () => {
    const texts = buildReminderTexts(translate, { streak: 4, day: 2 });
    expect(texts.supplements.title).toBe("reminders.supplements.title");
    expect(texts.water.body).toBe("reminders.water.body"); // day 2 → base variant
    expect(texts.streak.title).toBe("reminders.streak.title");
    expect(texts.streak.body).toBe("reminders.streak.body.active#4");
  });

  it("uses the none streak key at streak 0", () => {
    const texts = buildReminderTexts(translate, { streak: 0, day: 1 });
    expect(texts.streak.body).toBe("reminders.streak.body.none#0");
  });
});
