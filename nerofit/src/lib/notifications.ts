import type * as NotificationsModule from "expo-notifications";
import { Platform } from "react-native";

type Notifications = typeof NotificationsModule;

const CHANNEL_ID = "reminders";

// Lazily resolved. `undefined` = not tried yet, `null` = native module absent.
let mod: Notifications | null | undefined;

// Load expo-notifications only on demand. In a build WITHOUT the native module
// (e.g. an older dev client before the rebuild, or Expo Go), the require throws
// — we catch it and treat notifications as unavailable instead of crashing the
// whole app at import time.
function getMod(): Notifications | null {
  if (mod !== undefined) return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const N = require("expo-notifications") as Notifications;
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    mod = N;
  } catch {
    mod = null;
  }
  return mod;
}

export function notificationsAvailable(): boolean {
  return getMod() !== null;
}

export type ReminderId = "supplements" | "water" | "workout" | "streak";
export type ReminderCopy = { title: string; body: string };
export type ReminderTexts = Record<ReminderId, ReminderCopy>;

// Stable order — also drives iteration everywhere (settings list, scheduling).
export const REMINDER_IDS: ReminderId[] = [
  "supplements",
  "water",
  "workout",
  "streak",
];

// Default local daily reminder times (24h). Users can override the hour per
// reminder from the notification-settings screen.
export const DEFAULT_TIMES: Record<ReminderId, { hour: number; minute: number }> = {
  supplements: { hour: 9, minute: 0 },
  water: { hour: 13, minute: 0 },
  workout: { hour: 18, minute: 0 },
  streak: { hour: 20, minute: 0 },
};

// Per-reminder scheduling preference (persisted device-locally, see
// features/notifications/prefs.ts).
export type ReminderPref = { enabled: boolean; hour: number; minute: number };
export type ReminderPrefs = Record<ReminderId, ReminderPref>;

export type ReminderRequest = {
  id: ReminderId;
  content: ReminderCopy;
  hour: number;
  minute: number;
};

// Pure: turn prefs + copy into the daily notification requests to schedule.
// Only enabled reminders are included. No native calls, so it's unit-testable
// without the expo-notifications module.
export function buildReminderRequests(
  prefs: ReminderPrefs,
  texts: ReminderTexts,
): ReminderRequest[] {
  return REMINDER_IDS.filter((id) => prefs[id]?.enabled).map((id) => ({
    id,
    content: texts[id],
    hour: prefs[id].hour,
    minute: prefs[id].minute,
  }));
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const N = getMod();
  if (!N) return false;
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  const req = await N.requestPermissionsAsync();
  return req.granted;
}

// Read-only permission check — never triggers the system prompt. Used by the
// foreground sync so re-scheduling can't surprise the user with a dialog.
export async function hasNotificationPermission(): Promise<boolean> {
  const N = getMod();
  if (!N) return false;
  const current = await N.getPermissionsAsync();
  return current.granted;
}

async function ensureAndroidChannel(N: Notifications): Promise<void> {
  if (Platform.OS !== "android") return;
  await N.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Reminders",
    importance: N.AndroidImportance.DEFAULT,
  });
}

// Replace any existing schedule with the enabled reminders from `prefs`.
export async function scheduleReminders(
  prefs: ReminderPrefs,
  texts: ReminderTexts,
): Promise<void> {
  const N = getMod();
  if (!N) return;
  await ensureAndroidChannel(N);
  await N.cancelAllScheduledNotificationsAsync();
  for (const req of buildReminderRequests(prefs, texts)) {
    await N.scheduleNotificationAsync({
      content: { title: req.content.title, body: req.content.body },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: req.hour,
        minute: req.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export async function cancelReminders(): Promise<void> {
  const N = getMod();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
}
