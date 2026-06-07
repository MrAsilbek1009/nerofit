import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowLeft, ArrowUp, Flame } from "lucide-react-native";
import { Chip, SectionHeader } from "@/components/ui";
import { TrendChart } from "@/features/progress/components/TrendChart";
import { WeeklyActivity } from "@/features/progress/components/WeeklyActivity";
import { computeDayStreak } from "@/features/progress/streak";
import { useUserId } from "@/hooks/useUser";
import {
  type ProgressPeriod,
  useStreakSessions,
  useWeekSessions,
  useWeightSeries,
  useWorkoutStats,
} from "@/lib/queries/progress";
import { colors, fonts, space, typography } from "@/theme";

const PERIODS: ProgressPeriod[] = ["week", "month", "year"];

export default function ProgressScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();
  const [period, setPeriod] = useState<ProgressPeriod>("week");

  const weight = useWeightSeries(userId, period);
  const weekSessions = useWeekSessions(userId);
  const streakSessions = useStreakSessions(userId);
  const stats = useWorkoutStats(userId);

  const series = weight.data ?? [];
  const values = series.map((p) => p.weight_kg);
  const latest = values.at(-1);
  const first = values[0];
  const delta = latest !== undefined && first !== undefined ? latest - first : 0;
  const streak = computeDayStreak(streakSessions.data ?? []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[3],
          paddingHorizontal: space[5],
          paddingVertical: space[3],
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <ArrowLeft size={24} color={colors.textHi} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space[5],
          paddingBottom: space[7],
          gap: space[6],
        }}
      >
        <Text style={[typography.display, { fontSize: 36, textTransform: "uppercase" }]}>
          {t("progress.title")}
        </Text>

        {/* Period toggle */}
        <View style={{ flexDirection: "row", gap: space[2] }}>
          {PERIODS.map((p) => (
            <Chip
              key={p}
              label={t(`progress.period.${p}`)}
              selected={period === p}
              onPress={() => setPeriod(p)}
            />
          ))}
        </View>

        {/* Weight trend */}
        <View style={{ gap: space[3] }}>
          <Text style={typography.labelCaps}>{t("progress.weightTrend")}</Text>
          {weight.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : values.length < 2 ? (
            <Text style={typography.bodyMuted}>{t("progress.emptyWeight")}</Text>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[1] }}>
                  <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 28 }}>
                    {latest?.toFixed(1)}
                  </Text>
                  <Text style={typography.bodyMuted}>{t("progress.kg")}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space[1] }}>
                  {delta <= 0 ? (
                    <ArrowDown size={14} color={colors.accent} />
                  ) : (
                    <ArrowUp size={14} color={colors.accent} />
                  )}
                  <Text style={{ fontFamily: fonts.label, color: colors.accent, fontSize: 12 }}>
                    {Math.abs(delta).toFixed(1)} {t("progress.kg")}
                  </Text>
                </View>
              </View>
              <TrendChart values={values} />
            </>
          )}
        </View>

        {/* Weekly activity */}
        <View style={{ gap: space[4] }}>
          <Text style={typography.labelCaps}>{t("progress.weeklyActivity")}</Text>
          <WeeklyActivity sessionDates={weekSessions.data ?? []} />
        </View>

        {/* Day streak */}
        <View style={{ gap: space[2] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
            <Flame size={14} color={colors.accent} />
            <Text style={[typography.labelCaps, { color: colors.accent }]}>
              {t("progress.dayStreak")}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.display, color: colors.accent, fontSize: 80, lineHeight: 84 }}>
            {streak}
          </Text>
        </View>

        {/* Totals */}
        <View style={{ gap: space[5] }}>
          <Stat label={t("progress.totalVolume")} value={`${(stats.data?.volume ?? 0).toLocaleString()}`} suffix={t("progress.kg").toUpperCase()} />
          <Stat label={t("progress.workouts")} value={`${stats.data?.count ?? 0}`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <View style={{ gap: space[1] }}>
      <Text style={typography.labelCaps}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[1] }}>
        <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 26 }}>
          {value}
        </Text>
        {suffix ? <Text style={typography.bodyMuted}>{suffix}</Text> : null}
      </View>
    </View>
  );
}
