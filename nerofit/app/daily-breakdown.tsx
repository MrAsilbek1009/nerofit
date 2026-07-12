import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import { Button, ProgressRing } from "@/components/ui";
import { MacroBar } from "@/features/nutrition/components/MacroBar";
import { SectionLabel } from "@/features/nutrition/components/SectionLabel";
import { TrendChart } from "@/features/progress/components/TrendChart";
import { deriveCalorieGoal, sumMealLogs } from "@/features/home/summary";
import { useUserId } from "@/hooks/useUser";
import { useAdaptiveGoals } from "@/lib/queries/adaptiveGoals";
import { useTodayMealLogs, useWeeklyKcal } from "@/lib/queries/nutrition";
import { useProfile } from "@/lib/queries/profile";
import { colors, fonts, space, typography } from "@/theme";

/**
 * Daily Breakdown (Cal AI reference, docs/cal-ai-flow-study.md §2): one place
 * for today's calories vs goal, macro progress, the trailing week, and goal
 * editing. Reached from the Nutrition tab's macros section link.
 */
export default function DailyBreakdownScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();

  const profile = useProfile(userId);
  const mealLogs = useTodayMealLogs(userId);
  const week = useWeeklyKcal(userId);
  const adaptive = useAdaptiveGoals(userId);

  const loading = profile.isLoading || mealLogs.isLoading;
  const totals = sumMealLogs(mealLogs.data ?? []);
  const goal = profile.data ? deriveCalorieGoal(profile.data) : 0;
  const fraction = goal > 0 ? Math.min(1, totals.kcal / goal) : 0;
  const target = adaptive.data?.target ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: space[5],
          paddingVertical: space[3],
        }}
      >
        <Text style={typography.labelCaps}>{t("nutrition.breakdown.title")}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("a11y.close")}>
          <X size={24} color={colors.textHi} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : profile.isError || mealLogs.isError ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space[5] }}>
          <Text style={typography.bodyMuted}>{t("common.error")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: space[5], gap: space[6] }}>
          {/* Calories today */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ gap: space[1] }}>
              <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 44 }}>
                {totals.kcal}
                <Text style={{ fontSize: 20, color: colors.textLo }}>
                  {" "}
                  / {goal}
                </Text>
              </Text>
              <Text style={typography.labelCaps}>
                {t("nutrition.kcal").toUpperCase()} · {t("nutrition.breakdown.today")}
              </Text>
            </View>
            <ProgressRing progress={fraction} size={96} strokeWidth={5}>
              <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 15 }}>
                {Math.round(fraction * 100)}%
              </Text>
            </ProgressRing>
          </View>

          {/* Macros */}
          <View style={{ gap: space[4] }}>
            <SectionLabel label={t("nutrition.macros")} />
            <MacroBar label={t("nutrition.protein")} current={totals.protein} goal={profile.data?.protein_goal_g ?? 200} />
            <MacroBar label={t("nutrition.carbs")} current={totals.carbs} goal={profile.data?.carbs_goal_g ?? 300} />
            <MacroBar label={t("nutrition.fats")} current={totals.fats} goal={profile.data?.fats_goal_g ?? 80} />
          </View>

          {/* This week */}
          <View style={{ gap: space[4] }}>
            <SectionLabel label={t("nutrition.breakdown.thisWeek")} />
            {week.isLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : week.data && week.data.values.some((v) => v > 0) ? (
              <View style={{ gap: space[3] }}>
                <TrendChart values={week.data.values} height={72} />
                <Text style={typography.bodyMuted}>
                  {t("nutrition.breakdown.avgPerDay", { kcal: week.data.avg })}
                </Text>
              </View>
            ) : (
              <Text style={[typography.bodyMuted, { fontStyle: "italic" }]}>
                {t("nutrition.breakdown.emptyWeek")}
              </Text>
            )}
            {target ? (
              <Text style={[typography.labelCaps, { fontSize: 10 }]}>
                {t("nutrition.adaptive.tdee", { kcal: target.tdee_kcal })}
                {target.weight_trend_weekly_kg != null
                  ? `  ·  ${t("nutrition.breakdown.trend", { delta: target.weight_trend_weekly_kg })}`
                  : ""}
              </Text>
            ) : null}
          </View>

          <Button
            label={t("nutrition.breakdown.editGoals")}
            variant="secondary"
            onPress={() => router.push("/edit-goals")}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
