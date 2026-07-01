import {
  DEFAULT_TIMES,
  REMINDER_IDS,
  type ReminderPrefs,
} from "@/lib/notifications";

// Per-reminder preferences (which reminders are on + their hour). Pure logic
// only — persistence lives in ./storage so this stays unit-testable without the
// AsyncStorage native module.

// AsyncStorage keys, shared with ./storage.
export const PREFS_KEY = "reminder-prefs";
// Legacy master on/off switch (pre-14D), migrated into per-reminder prefs on the
// first load then retired.
export const LEGACY_ENABLED_KEY = "notifications-enabled";

// Build a fresh prefs object (never share nested objects between callers — they
// get mutated immutably in React state).
function buildPrefs(enabled: boolean): ReminderPrefs {
  return REMINDER_IDS.reduce((acc, id) => {
    acc[id] = {
      enabled,
      hour: DEFAULT_TIMES[id].hour,
      minute: DEFAULT_TIMES[id].minute,
    };
    return acc;
  }, {} as ReminderPrefs);
}

export function anyEnabled(prefs: ReminderPrefs): boolean {
  return REMINDER_IDS.some((id) => prefs[id]?.enabled);
}

function isValidHour(h: unknown): h is number {
  return typeof h === "number" && Number.isInteger(h) && h >= 0 && h <= 23;
}

function isValidMinute(m: unknown): m is number {
  return typeof m === "number" && Number.isInteger(m) && m >= 0 && m <= 59;
}

// Pure: normalise a stored blob (+ the legacy master flag) into a complete,
// valid ReminderPrefs. Unknown/corrupt fields fall back to defaults. When there
// is no stored blob yet, honour the old master switch so users who had reminders
// on keep them after upgrading.
export function parsePrefs(raw: string | null, legacyEnabled: boolean): ReminderPrefs {
  if (!raw) return buildPrefs(legacyEnabled);

  let stored: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return buildPrefs(false);
    stored = parsed as Record<string, unknown>;
  } catch {
    return buildPrefs(false);
  }

  const prefs = buildPrefs(false);
  for (const id of REMINDER_IDS) {
    const v = stored[id];
    if (v && typeof v === "object") {
      const rec = v as Record<string, unknown>;
      prefs[id] = {
        enabled: typeof rec.enabled === "boolean" ? rec.enabled : prefs[id].enabled,
        hour: isValidHour(rec.hour) ? rec.hour : prefs[id].hour,
        minute: isValidMinute(rec.minute) ? rec.minute : prefs[id].minute,
      };
    }
  }
  return prefs;
}

export function serializePrefs(prefs: ReminderPrefs): string {
  return JSON.stringify(prefs);
}
