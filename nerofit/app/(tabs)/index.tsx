import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Activity, HeartPulse } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "@/components/ui";
import { DailyGoalCard } from "@/features/home/components/DailyGoalCard";
import { HealthMetricCard } from "@/features/home/components/HealthMetricCard";
import { MiniBars, MiniSparkline } from "@/features/home/components/MiniCharts";
import { ProgramsSection } from "@/features/home/components/ProgramsSection";
import { WelcomeHeader } from "@/features/home/components/WelcomeHeader";
import { useUserId } from "@/hooks/useUser";
import { useProfile } from "@/lib/queries/profile";
import { useRecentHealthMetrics } from "@/lib/queries/healthMetrics";
import { useAddWaterLog, useTodayWaterTotal } from "@/lib/queries/waterLogs";
import { colors, space, typography } from "@/theme";

const WATER_INCREMENT_ML = 250;

// Recent metrics come back newest-first; charts want oldest → newest.
function chronological(values: number[]): number[] {
  return [...values].reverse();
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const userId = useUserId();

  const profileQuery = useProfile(userId);
  const waterTotal = useTodayWaterTotal(userId);
  const heartRate = useRecentHealthMetrics(userId, "heart_rate");
  const bloodPressure = useRecentHealthMetrics(userId, "blood_pressure_systolic");

  const addWater = useAddWaterLog(userId);

  const loading =
    profileQuery.isLoading ||
    waterTotal.isLoading ||
    heartRate.isLoading ||
    bloodPressure.isLoading;
  const error =
    profileQuery.error ?? waterTotal.error ?? heartRate.error ?? bloodPressure.error;

  function onRefresh() {
    void profileQuery.refetch();
    void waterTotal.refetch();
    void heartRate.refetch();
    void bloodPressure.refetch();
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
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <WelcomeHeader name={profile.name} avatarUrl={profile.avatar_url} />

        <DailyGoalCard
          current={waterTotal.data ?? 0}
          goal={profile.daily_water_goal_ml}
          onAddWater={() => addWater.mutate(WATER_INCREMENT_ML)}
        />

        <View style={{ gap: space[3] }}>
          <SectionHeader
            title={t("home.healthMetrics")}
            seeAllLabel={t("home.seeAll")}
            onSeeAll={() => undefined}
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

        <ProgramsSection />
      </ScrollView>
    </SafeAreaView>
  );
}
