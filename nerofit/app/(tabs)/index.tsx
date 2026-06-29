import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Activity, HeartPulse } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button, SectionHeader } from "@/components/ui";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { WeekStrip } from "@/features/home/components/WeekStrip";
import { DailySummaryCarousel } from "@/features/home/components/DailySummaryCarousel";
import { CaloriesCard } from "@/features/home/components/CaloriesCard";
import { MacroGauges } from "@/features/home/components/MacroGauges";
import { MicrosCard } from "@/features/home/components/MicrosCard";
import { ActivityCard } from "@/features/home/components/ActivityCard";
import { WaterCard } from "@/features/home/components/WaterCard";
import { RecentMeal } from "@/features/home/components/RecentMeal";
import { HealthMetricCard } from "@/features/home/components/HealthMetricCard";
import { MiniBars, MiniSparkline } from "@/features/home/components/MiniCharts";
import { ProgramsSection } from "@/features/home/components/ProgramsSection";
import {
  STEPS_GOAL,
  computeHealthScore,
  consumedFraction,
  deriveCalorieGoal,
  estimateCaloriesBurned,
  remaining,
  sumMealLogs,
  sumMicros,
} from "@/features/home/summary";
import { computeDayStreak } from "@/features/progress/streak";
import { useUserId } from "@/hooks/useUser";
import { useProfile } from "@/lib/queries/profile";
import { useLatestBodyMetric } from "@/lib/queries/bodyMetrics";
import { useRecentHealthMetrics } from "@/lib/queries/healthMetrics";
import { useTodayMealLogs } from "@/lib/queries/nutrition";
import { useStreakSessions, useWeekSessions } from "@/lib/queries/progress";
import { useStepsToday } from "@/lib/queries/steps";
import { useAddWaterLog, useTodayWaterTotal } from "@/lib/queries/waterLogs";
import { colors, space, typography } from "@/theme";

// Fallback serving when the profile hasn't been loaded / migrated yet.
const DEFAULT_WATER_SERVING_ML = 250;

// Recent metrics come back newest-first; charts want oldest → newest.
function chronological(values: number[]): number[] {
  return [...values].reverse();
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useUserId();

  const profileQuery = useProfile(userId);
  const mealLogs = useTodayMealLogs(userId);
  const waterTotal = useTodayWaterTotal(userId);
  const weekSessions = useWeekSessions(userId);
  const streakSessions = useStreakSessions(userId);
  const heartRate = useRecentHealthMetrics(userId, "heart_rate");
  const bloodPressure = useRecentHealthMetrics(userId, "blood_pressure_systolic");
  const steps = useStepsToday();
  const latestBody = useLatestBodyMetric(userId);

  const addWater = useAddWaterLog(userId);

  const loading =
    profileQuery.isLoading ||
    mealLogs.isLoading ||
    waterTotal.isLoading ||
    weekSessions.isLoading ||
    streakSessions.isLoading;
  const error = profileQuery.error ?? mealLogs.error ?? waterTotal.error;

  function onRefresh() {
    void profileQuery.refetch();
    void mealLogs.refetch();
    void waterTotal.refetch();
    void weekSessions.refetch();
    void streakSessions.refetch();
    void heartRate.refetch();
    void bloodPressure.refetch();
    void steps.refetch();
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profileQuery.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View
          style={{
            flex: 1,
            padding: space[5],
            alignItems: "center",
            justifyContent: "center",
            gap: space[3],
          }}
        >
          <Text style={typography.body}>{t("common.error")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const profile = profileQuery.data;
  const logs = mealLogs.data ?? [];

  // Nutrition dashboard figures.
  const totals = sumMealLogs(logs);
  const micros = sumMicros(logs);
  const healthScore = computeHealthScore(micros);
  const calorieGoal = deriveCalorieGoal(profile);

  const stepCount = steps.data ?? 0;
  const caloriesBurned = estimateCaloriesBurned(stepCount, latestBody.data?.weight_kg ?? null);
  const macro = (goal: number, consumed: number) => ({
    left: remaining(goal, consumed),
    fraction: consumedFraction(goal, consumed),
  });

  const streak = computeDayStreak(streakSessions.data ?? []);
  // A day counts as "active" when a workout was completed; today also counts
  // once a meal is logged.
  const activeDays = [
    ...(weekSessions.data ?? []),
    ...(logs.length > 0 ? [new Date().toISOString()] : []),
  ];

  const recent = logs.length > 0 ? logs[logs.length - 1] : null;

  const bpValues = (bloodPressure.data ?? []).map((m) => m.value);
  const hrValues = (heartRate.data ?? []).map((m) => m.value);
  const latestBp = bpValues[0];
  const latestHr = hrValues[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView
        contentContainerStyle={{
          padding: space[5],
          gap: space[5],
          paddingBottom: space[7],
        }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <HomeHeader streak={streak} />

        <WeekStrip activeDays={activeDays} />

        <DailySummaryCarousel
          pages={[
            <View key="macros" style={{ gap: space[3] }}>
              <CaloriesCard
                left={remaining(calorieGoal, totals.kcal)}
                fraction={consumedFraction(calorieGoal, totals.kcal)}
              />
              <MacroGauges
                protein={macro(profile.protein_goal_g, totals.protein)}
                carbs={macro(profile.carbs_goal_g, totals.carbs)}
                fats={macro(profile.fats_goal_g, totals.fats)}
              />
            </View>,
            <MicrosCard key="micros" micros={micros} score={healthScore} />,
            <View key="activity" style={{ gap: space[3] }}>
              <ActivityCard
                steps={stepCount}
                goal={STEPS_GOAL}
                caloriesBurned={caloriesBurned}
              />
              <WaterCard
                current={waterTotal.data ?? 0}
                goal={profile.daily_water_goal_ml}
                onAdd={() =>
                  addWater.mutate(
                    profile.water_serving_ml ?? DEFAULT_WATER_SERVING_ML,
                  )
                }
                onSettings={() => router.push("/water-settings")}
              />
            </View>,
          ]}
        />

        {/* Recently logged */}
        <View style={{ gap: space[3] }}>
          <SectionHeader
            title={t("home.recentlyLogged")}
            seeAllLabel={t("home.seeAll")}
            onSeeAll={() => router.push("/nutrition")}
          />
          {recent ? (
            <RecentMeal log={recent} onPress={() => router.push("/nutrition")} />
          ) : (
            <Text style={typography.bodyMuted}>{t("home.noMealsYet")}</Text>
          )}
          <Button
            label={t("nutrition.scan.title")}
            variant="secondary"
            onPress={() => router.push("/food-scan")}
          />
        </View>

        <ProgramsSection />

        {/* Health metrics (kept below the nutrition dashboard) */}
        <View style={{ gap: space[3] }}>
          <SectionHeader
            title={t("home.healthMetrics")}
            seeAllLabel={t("home.seeAll")}
            onSeeAll={() => router.push("/progress")}
          />
          <View style={{ flexDirection: "row", gap: space[3] }}>
            <HealthMetricCard
              icon={Activity}
              label={t("home.metrics.bloodPressure")}
              value={latestBp !== undefined ? String(latestBp) : null}
              unit={t("home.units.bloodPressure")}
              emptyMessage={t("home.empty.bloodPressure")}
              chart={<MiniBars values={chronological(bpValues)} />}
            />
            <HealthMetricCard
              icon={HeartPulse}
              label={t("home.metrics.heartRate")}
              value={latestHr !== undefined ? String(latestHr) : null}
              unit={t("home.units.heartRate")}
              emptyMessage={t("home.empty.heartRate")}
              chart={<MiniSparkline values={chronological(hrValues)} />}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
