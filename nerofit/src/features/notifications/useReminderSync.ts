import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useTranslation } from "react-i18next";
import { computeDayStreak } from "@/features/progress/streak";
import { useUserId } from "@/hooks/useUser";
import { useStreakSessions } from "@/lib/queries/progress";
import { useActiveMembership } from "@/lib/queries/membership";
import {
  cancelReminders,
  hasNotificationPermission,
  notificationsAvailable,
  scheduleReminders,
} from "@/lib/notifications";
import { buildReminderTexts } from "./content";
import { EXPIRY_LEAD_DAYS, membershipReminderFireDate } from "./membership";
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
  const membership = useActiveMembership(userId);
  // When (if ever) to fire the one-off "membership expires soon" reminder. A
  // number for a stable effect dependency; 0 = nothing to schedule.
  const fireTime = membershipReminderFireDate(membership.data)?.getTime() ?? 0;
  // Last state we scheduled for: streak + membership fire time, or "off".
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sync(): Promise<void> {
      if (!userId || !notificationsAvailable()) return;
      const prefs = await loadPrefs();
      if (cancelled) return;

      const dailies = anyEnabled(prefs);
      const wantMembership = fireTime > Date.now();

      if (!dailies && !wantMembership) {
        if (lastKey.current !== "off") {
          await cancelReminders();
          lastKey.current = "off";
        }
        return;
      }

      if (!(await hasNotificationPermission()) || cancelled) return;

      const key = `on:${streak}:${wantMembership ? fireTime : "none"}`;
      if (lastKey.current === key) return; // nothing relevant changed
      await scheduleReminders(
        prefs,
        buildReminderTexts(t, { streak }),
        wantMembership
          ? {
              content: {
                title: t("reminders.membership.title"),
                body: t("reminders.membership.body", { days: EXPIRY_LEAD_DAYS }),
              },
              date: new Date(fireTime),
            }
          : null,
      );
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
  }, [userId, streak, t, fireTime]);
}
