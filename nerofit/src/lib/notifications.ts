import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Foreground display behaviour.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = "reminders";

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
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Replace any existing schedule with the three daily reminders.
export async function scheduleReminders(texts: ReminderTexts): Promise<void> {
  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const id of Object.keys(SCHEDULE) as ReminderId[]) {
    const { hour, minute } = SCHEDULE[id];
    await Notifications.scheduleNotificationAsync({
      content: { title: texts[id].title, body: texts[id].body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
