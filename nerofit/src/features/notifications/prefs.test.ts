import { describe, expect, it } from "@jest/globals";
import { DEFAULT_TIMES } from "@/lib/notifications";
import { anyEnabled, parsePrefs, serializePrefs } from "./prefs";

describe("parsePrefs", () => {
  it("defaults everything off when nothing is stored and no legacy flag", () => {
    const prefs = parsePrefs(null, false);
    expect(anyEnabled(prefs)).toBe(false);
    expect(prefs.supplements.hour).toBe(DEFAULT_TIMES.supplements.hour);
    expect(prefs.streak.hour).toBe(DEFAULT_TIMES.streak.hour);
  });

  it("migrates the legacy master flag to all-on with default times", () => {
    const prefs = parsePrefs(null, true);
    expect(anyEnabled(prefs)).toBe(true);
    expect(prefs.water.enabled).toBe(true);
    expect(prefs.water.hour).toBe(DEFAULT_TIMES.water.hour);
  });

  it("round-trips a serialized prefs object", () => {
    const prefs = parsePrefs(null, true);
    prefs.workout.hour = 7;
    prefs.streak.enabled = false;

    const again = parsePrefs(serializePrefs(prefs), false);
    expect(again.workout.hour).toBe(7);
    expect(again.streak.enabled).toBe(false);
    expect(again.water.enabled).toBe(true);
  });

  it("ignores the legacy flag once real prefs exist", () => {
    const storedAllOff = serializePrefs(parsePrefs(null, false));
    const prefs = parsePrefs(storedAllOff, true); // legacy true must NOT re-enable
    expect(anyEnabled(prefs)).toBe(false);
  });

  it("falls back to defaults on corrupt json", () => {
    expect(anyEnabled(parsePrefs("{not valid json", false))).toBe(false);
  });

  it("clamps an out-of-range hour back to the default", () => {
    const prefs = parsePrefs(
      JSON.stringify({ water: { enabled: true, hour: 99, minute: 0 } }),
      false,
    );
    expect(prefs.water.enabled).toBe(true);
    expect(prefs.water.hour).toBe(DEFAULT_TIMES.water.hour);
  });
});
