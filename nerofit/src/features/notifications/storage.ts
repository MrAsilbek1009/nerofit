import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReminderPrefs } from "@/lib/notifications";
import {
  LEGACY_ENABLED_KEY,
  PREFS_KEY,
  parsePrefs,
  serializePrefs,
} from "./prefs";

// AsyncStorage-backed persistence for reminder prefs. Kept separate from the
// pure logic in ./prefs so that module stays testable without the native module.

export async function loadPrefs(): Promise<ReminderPrefs> {
  const [raw, legacy] = await Promise.all([
    AsyncStorage.getItem(PREFS_KEY),
    AsyncStorage.getItem(LEGACY_ENABLED_KEY),
  ]);
  return parsePrefs(raw, legacy === "true");
}

export async function savePrefs(prefs: ReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, serializePrefs(prefs));
  // Retire the legacy flag once we've persisted real prefs so it can't override
  // a future load.
  await AsyncStorage.removeItem(LEGACY_ENABLED_KEY);
}
