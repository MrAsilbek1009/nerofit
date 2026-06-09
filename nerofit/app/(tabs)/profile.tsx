import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Bell,
  ChevronRight,
  Globe,
  LogOut,
  Star,
} from "lucide-react-native";
import { Avatar, Chip } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { useProfile } from "@/lib/queries/profile";
import { useGoals } from "@/lib/queries/goals";
import { useLatestBodyMetric } from "@/lib/queries/bodyMetrics";
import { useWorkoutStats } from "@/lib/queries/progress";
import { useAuthStore } from "@/store/auth";
import { setLocale, SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const userId = useUserId();
  const signOut = useAuthStore((s) => s.signOut);

  const profile = useProfile(userId);
  const goals = useGoals(userId);
  const latestBody = useLatestBodyMetric(userId);
  const stats = useWorkoutStats(userId);

  const [notifications, setNotifications] = useState(true);

  const focus = goals.data?.focus;
  const subtitle = focus ? t(`profile.focusLabels.${focus}`) : "";
  const weight = latestBody.data?.weight_kg;
  const goalWeight = goals.data?.target_weight;
  const tier = profile.data?.subscription_tier ?? "free";
  const isElite = tier === "elite";
  const currentLocale = i18n.language as string;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space[7] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: space[5],
            paddingVertical: space[3],
          }}
        >
          <Text
            style={{
              fontFamily: fonts.display,
              color: colors.textHi,
              fontSize: 18,
              letterSpacing: 2,
            }}
          >
            {t("brand")}
          </Text>
          <Bell size={20} color={colors.textHi} />
        </View>

        {/* Identity */}
        <View style={{ alignItems: "center", gap: space[3], paddingTop: space[4] }}>
          <Avatar uri={profile.data?.avatar_url} name={profile.data?.name} size={96} />
          <View style={{ alignItems: "center", gap: space[1] }}>
            <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 28 }}>
              {profile.data?.name ?? ""}
            </Text>
            {subtitle ? (
              <Text style={[typography.labelCaps, { color: colors.accent }]}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        {/* Stats */}
        <View
          style={{
            flexDirection: "row",
            marginHorizontal: space[5],
            marginTop: space[6],
            paddingVertical: space[4],
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Stat value={weight != null ? weight.toFixed(1) : "—"} label={t("profile.weight")} />
          <Divider />
          <Stat value={goalWeight != null ? Number(goalWeight).toFixed(1) : "—"} label={t("profile.goal")} />
          <Divider />
          <Stat value={`${stats.data?.count ?? 0}`} label={t("profile.workouts")} accent />
        </View>

        {/* Settings */}
        <View style={{ marginTop: space[6], paddingHorizontal: space[5] }}>
          <Row
            icon={<Activity size={18} color={colors.textHi} />}
            label={t("profile.bodyComposition")}
            onPress={() => router.push("/body-composition")}
            right={<ChevronRight size={18} color={colors.textLo} />}
          />
          <Row
            icon={<Bell size={18} color={colors.textHi} />}
            label={t("profile.notifications")}
            right={
              <Switch
                value={notifications}
                onValueChange={(v) => {
                  setNotifications(v);
                  if (v)
                    Alert.alert(t("profile.comingSoonTitle"), t("profile.notificationsBody"));
                }}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor={colors.textHi}
              />
            }
          />
          <Row
            icon={<Star size={18} color={colors.textHi} />}
            label={t("profile.subscription")}
            onPress={() =>
              Alert.alert(t("profile.comingSoonTitle"), t("profile.subscriptionBody"))
            }
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.accent,
                    borderRadius: radii.pill,
                    paddingHorizontal: space[3],
                    paddingVertical: 3,
                  }}
                >
                  <Text style={[typography.labelCaps, { color: colors.accent, fontSize: 10 }]}>
                    {isElite ? t("profile.tierElite") : t("profile.tierFree")}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textLo} />
              </View>
            }
          />
          <Row
            icon={<Globe size={18} color={colors.textHi} />}
            label={t("profile.language")}
            right={
              <View style={{ flexDirection: "row", gap: space[2] }}>
                {SUPPORTED_LOCALES.map((loc) => (
                  <Chip
                    key={loc}
                    label={loc.toUpperCase()}
                    selected={currentLocale === loc}
                    onPress={() => setLocale(loc as SupportedLocale)}
                  />
                ))}
              </View>
            }
            showDivider={false}
          />
        </View>

        {/* Log out */}
        <Pressable
          onPress={signOut}
          accessibilityRole="button"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space[3],
            paddingHorizontal: space[5],
            paddingVertical: space[4],
            marginTop: space[5],
          }}
        >
          <LogOut size={18} color="#FF6B6B" />
          <Text style={{ fontFamily: fonts.bodyMed, color: "#FF6B6B", fontSize: 16 }}>
            {t("profile.logOut")}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: space[1] }}>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 22,
          color: accent ? colors.accent : colors.textHi,
        }}
      >
        {value}
      </Text>
      <Text style={[typography.labelCaps, { fontSize: 9, textAlign: "center" }]}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ width: 1, backgroundColor: colors.border, marginVertical: space[1] }} />;
}

function Row({
  icon,
  label,
  right,
  onPress,
  showDivider = true,
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
}) {
  return (
    <View style={{ borderBottomWidth: showDivider ? 1 : 0, borderBottomColor: colors.border }}>
      <Pressable
        onPress={onPress}
        accessibilityRole={onPress ? "button" : undefined}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[3],
          paddingVertical: space[4],
        }}
      >
        {icon}
        <Text style={{ flex: 1, fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }}>
          {label}
        </Text>
        {right}
      </Pressable>
    </View>
  );
}
