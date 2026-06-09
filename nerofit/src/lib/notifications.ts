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

export type ReminderId = "supplements" | "water" | "workout";
export type ReminderCopy = { title: string; body: string };
export type ReminderTexts = Record<ReminderId, ReminderCopy>;

// Local daily reminder times (24h).
const SCHEDULE: Record<ReminderId, { hour: number; minute: number }> = {
  supplements: { hour: 9, minute: 0 },
  water: { hour: 13, minute: 0 },
  workout: { hour: 18, minute: 0 },
};

export async function ensureNotificationPermission(): Promise<boolean> {
  const N = getMod();
  if (!N) return false;
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  const req = await N.requestPermissionsAsync();
  return req.granted;
}

async function ensureAndroidChannel(N: Notifications): Promise<void> {
  if (Platform.OS !== "android") return;
  await N.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Reminders",
    importance: N.AndroidImportance.DEFAULT,
  });
}

// Replace any existing schedule with the three daily reminders.
export async function scheduleReminders(texts: ReminderTexts): Promise<void> {
  const N = getMod();
  if (!N) return;
  await ensureAndroidChannel(N);
  await N.cancelAllScheduledNotificationsAsync();
  for (const id of Object.keys(SCHEDULE) as ReminderId[]) {
    const { hour, minute } = SCHEDULE[id];
    await N.scheduleNotificationAsync({
      content: { title: texts[id].title, body: texts[id].body },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
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
