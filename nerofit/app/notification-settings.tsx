import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import { WheelPicker } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { computeDayStreak } from "@/features/progress/streak";
import { useStreakSessions } from "@/lib/queries/progress";
import {
  cancelReminders,
  ensureNotificationPermission,
  hasNotificationPermission,
  notificationsAvailable,
  REMINDER_IDS,
  scheduleReminders,
  type ReminderId,
  type ReminderPref,
  type ReminderPrefs,
} from "@/lib/notifications";
import { buildReminderTexts } from "@/features/notifications/content";
import { anyEnabled } from "@/features/notifications/prefs";
import { loadPrefs, savePrefs } from "@/features/notifications/storage";
import { track } from "@/lib/analytics";
import { colors, fonts, radii, space, typography } from "@/theme";

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function Header({ onClose, title }: { onClose: () => void; title: string }) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: space[5],
        paddingVertical: space[3],
      }}
    >
      <Pressable
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.close")}
        style={{ position: "absolute", left: space[5] }}
      >
        <X size={24} color={colors.textHi} />
      </Pressable>
      <Text style={typography.h2}>{title}</Text>
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);

  // Reminder prefs are a device-local setting (AsyncStorage), not server state,
  // so they load here rather than via TanStack Query. Mount the form only once
  // loaded so each switch/wheel seeds from the saved value.
  useEffect(() => {
    void loadPrefs().then(setPrefs);
    track("notification_settings_opened");
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header onClose={() => router.back()} title={t("notificationSettings.title")} />
      {prefs === null ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <NotificationSettingsForm initial={prefs} />
      )}
    </SafeAreaView>
  );
}

function NotificationSettingsForm({ initial }: { initial: ReminderPrefs }) {
  const { t } = useTranslation();
  const userId = useUserId();
  const streakSessions = useStreakSessions(userId);
  const streak = computeDayStreak(streakSessions.data ?? []);

  const [prefs, setPrefs] = useState<ReminderPrefs>(initial);
  const available = notificationsAvailable();
  // null = not yet checked; false when the native module is absent. Read-only
  // check, so opening the screen never prompts for permission.
  const [permitted, setPermitted] = useState<boolean | null>(available ? null : false);

  useEffect(() => {
    if (!available) return;
    void hasNotificationPermission().then(setPermitted);
  }, [available]);

  async function apply(next: ReminderPrefs) {
    setPrefs(next);
    await savePrefs(next);
    if (!anyEnabled(next)) {
      await cancelReminders();
      return;
    }
    if (!available) return;
    const granted = await ensureNotificationPermission();
    setPermitted(granted);
    if (!granted) return;
    await scheduleReminders(next, buildReminderTexts(t, { streak }));
  }

  function onToggle(id: ReminderId, enabled: boolean) {
    track("reminder_toggled", { reminder: id, enabled });
    void apply({ ...prefs, [id]: { ...prefs[id], enabled } });
  }

  function onHour(id: ReminderId, hour: number) {
    track("reminder_time_changed", { reminder: id, hour });
    void apply({ ...prefs, [id]: { ...prefs[id], hour } });
  }

  const showUnavailable = !available;
  const showPermissionNote = available && permitted === false && anyEnabled(prefs);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: space[7] }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={[
          typography.bodyMuted,
          { paddingHorizontal: space[5], marginBottom: space[3] },
        ]}
      >
        {t("notificationSettings.subtitle")}
      </Text>

      {showUnavailable ? (
        <Notice text={t("notificationSettings.unavailable")} />
      ) : null}
      {showPermissionNote ? (
        <Notice
          text={t("notificationSettings.permissionNote")}
          actionLabel={t("notificationSettings.openSettings")}
          onAction={() => void Linking.openSettings()}
        />
      ) : null}

      {REMINDER_IDS.map((id) => (
        <ReminderRow
          key={id}
          id={id}
          pref={prefs[id]}
          onToggle={onToggle}
          onHour={onHour}
        />
      ))}
    </ScrollView>
  );
}

function Notice({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        marginHorizontal: space[5],
        marginBottom: space[4],
        padding: space[4],
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        gap: space[2],
      }}
    >
      <Text style={typography.bodyMuted}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={[typography.body, { color: colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ReminderRow({
  id,
  pref,
  onToggle,
  onHour,
}: {
  id: ReminderId;
  pref: ReminderPref;
  onToggle: (id: ReminderId, enabled: boolean) => void;
  onHour: (id: ReminderId, hour: number) => void;
}) {
  const { t } = useTranslation();
  const label = t(`notificationSettings.items.${id}.label`);
  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, h) => ({ label: formatHour(h), value: h })),
    [],
  );

  return (
    <View
      style={{
        paddingHorizontal: space[5],
        paddingVertical: space[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: space[3],
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
        <View style={{ flex: 1, gap: space[1] }}>
          <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }}>
            {label}
          </Text>
          <Text style={typography.bodyMuted}>
            {t(`notificationSettings.items.${id}.description`)}
          </Text>
        </View>
        <Switch
          value={pref.enabled}
          onValueChange={(v) => onToggle(id, v)}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.textHi}
          accessibilityLabel={label}
        />
      </View>

      {pref.enabled ? (
        <View style={{ gap: space[2] }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={typography.labelCaps}>{t("notificationSettings.time")}</Text>
            <Text style={[typography.body, { color: colors.accent }]}>
              {formatHour(pref.hour)}
            </Text>
          </View>
          <WheelPicker
            visibleCount={3}
            columns={[
              {
                key: `${id}-hour`,
                items: hours,
                value: pref.hour,
                onChange: (h) => onHour(id, h),
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}
