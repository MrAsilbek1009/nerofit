import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useTranslation } from "react-i18next";
import { computeDayStreak } from "@/features/progress/streak";
import { useUserId } from "@/hooks/useUser";
import { useStreakSessions } from "@/lib/queries/progress";
import {
  cancelReminders,
  hasNotificationPermission,
  notificationsAvailable,
  scheduleReminders,
} from "@/lib/notifications";
import { buildReminderTexts } from "./content";
import { anyEnabled } from "./prefs";
import { loadPrefs } from "./storage";

// Local daily reminders freeze their copy at schedule time, so a "5-day streak"
// line would go stale. Re-schedule whenever the app returns to the foreground
// (and once on mount) with a freshly-computed streak — but only when the streak
// actually changed, so it's a cheap no-op most of the time. Mounted once from
// the tabs layout. Never prompts for permission (read-only check).
export function useReminderSync(): void {
  const userId = useUserId();
  const { t } = useTranslation();
  const streakSessions = useStreakSessions(userId);
  const streak = computeDayStreak(streakSessions.data ?? []);
  // Last state we scheduled for: the streak count, or "off" when nothing is on.
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sync(): Promise<void> {
      if (!userId || !notificationsAvailable()) return;
      const prefs = await loadPrefs();
      if (cancelled) return;

      if (!anyEnabled(prefs)) {
        if (lastKey.current !== "off") {
          await cancelReminders();
          lastKey.current = "off";
        }
        return;
      }

      if (!(await hasNotificationPermission()) || cancelled) return;

      const key = `on:${streak}`;
      if (lastKey.current === key) return; // streak unchanged → nothing to do
      await scheduleReminders(prefs, buildReminderTexts(t, { streak }));
      if (!cancelled) lastKey.current = key;
    }

    void sync();
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "active") void sync();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [userId, streak, t]);
}
