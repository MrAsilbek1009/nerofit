import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Droplet, Plus } from "lucide-react-native";
import { Button, ProgressRing } from "@/components/ui";
import { MacroBar } from "@/features/nutrition/components/MacroBar";
import { SectionLabel } from "@/features/nutrition/components/SectionLabel";
import { SupplementRow } from "@/features/nutrition/components/SupplementRow";
import { useUserId } from "@/hooks/useUser";
import { useProfile } from "@/lib/queries/profile";
import {
  useMeals,
  useSupplements,
  useTodayMealLogs,
  useTodaySupplementLogs,
  useToggleSupplement,
} from "@/lib/queries/nutrition";
import { useTodayWaterTotal } from "@/lib/queries/waterLogs";
import type { MealLog, MealSlot } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];

export default function NutritionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useUserId();

  const profile = useProfile(userId);
  const mealLogs = useTodayMealLogs(userId);
  const meals = useMeals();
  const water = useTodayWaterTotal(userId);
  const supplements = useSupplements();
  const supplementLogs = useTodaySupplementLogs(userId);
  const toggleSupp = useToggleSupplement(userId);

  const logs = mealLogs.data ?? [];
  const macros = logs.reduce(
    (acc, m) => ({
      protein: acc.protein + (m.protein_g ?? 0),
      carbs: acc.carbs + (m.carbs_g ?? 0),
      fats: acc.fats + (m.fats_g ?? 0),
    }),
    { protein: 0, carbs: 0, fats: 0 },
  );

  const takenIds = new Set(
    (supplementLogs.data ?? []).filter((l) => l.taken).map((l) => l.supplement_id),
  );

  const imageById = new Map(
    (meals.data ?? []).map((m) => [m.id, m.image_url] as const),
  );

  const waterL = ((water.data ?? 0) / 1000).toFixed(1);
  const goalL = ((profile.data?.daily_water_goal_ml ?? 8000) / 1000).toFixed(1);
  const waterRatio = Math.max(
    0,
    Math.min(1, (water.data ?? 0) / (profile.data?.daily_water_goal_ml || 1)),
  );

  if (profile.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView
        contentContainerStyle={{ padding: space[5], gap: space[6], paddingBottom: space[7] }}
      >
        <Text style={[typography.display, { fontSize: 34, textTransform: "uppercase" }]}>
          {t("nutrition.title")}
        </Text>

        {/* Scan food (AI) */}
        <Button
          label={t("nutrition.scan.title")}
          onPress={() => router.push("/food-scan")}
        />

        {/* Macros */}
        <View style={{ gap: space[4] }}>
          <SectionLabel label={t("nutrition.macros")} />
          <MacroBar label={t("nutrition.protein")} current={macros.protein} goal={profile.data?.protein_goal_g ?? 200} />
          <MacroBar label={t("nutrition.carbs")} current={macros.carbs} goal={profile.data?.carbs_goal_g ?? 300} />
          <MacroBar label={t("nutrition.fats")} current={macros.fats} goal={profile.data?.fats_goal_g ?? 80} />
        </View>

        {/* Meals */}
        <View style={{ gap: space[4] }}>
          <SectionLabel label={t("nutrition.meals")} />
          {MEAL_SLOTS.map((slot) => {
            const slotLogs = logs.filter((l) => l.slot === slot);
            return (
              <MealSlotBlock
                key={slot}
                slot={slot}
                logs={slotLogs}
                imageById={imageById}
                onAdd={() => router.push(`/meal-picker?slot=${slot}`)}
              />
            );
          })}
        </View>

        {/* Hydration */}
        <View style={{ gap: space[4] }}>
          <SectionLabel label={t("nutrition.hydration")} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: space[5] }}>
            <View style={{ width: 88, height: 88, alignItems: "center", justifyContent: "center" }}>
              <ProgressRing progress={waterRatio} size={88} strokeWidth={4} />
              <View style={{ position: "absolute" }}>
                <Droplet size={22} color={colors.accent} fill={colors.accent} />
              </View>
            </View>
            <View style={{ gap: space[1] }}>
              <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 28 }}>
                {waterL}L
              </Text>
              <Text style={typography.labelCaps}>
                {t("nutrition.ofGoal", { goal: `${goalL}L` })}
              </Text>
            </View>
          </View>
        </View>

        {/* Protocol (supplements) */}
        <View style={{ gap: space[2] }}>
          <SectionLabel label={t("nutrition.protocol")} />
          {supplements.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            (supplements.data ?? []).map((s) => (
              <SupplementRow
                key={s.id}
                supplement={s}
                taken={takenIds.has(s.id)}
                onToggle={() =>
                  toggleSupp.mutate({ supplementId: s.id, taken: !takenIds.has(s.id) })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MealSlotBlock({
  slot,
  logs,
  imageById,
  onAdd,
}: {
  slot: MealSlot;
  logs: MealLog[];
  imageById: Map<string, string | null>;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const slotLabel = t(`nutrition.slots.${slot}`).toUpperCase();

  if (logs.length === 0) {
    return (
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={20} color={colors.textHi} />
        </View>
        <View style={{ gap: 2 }}>
          <Text style={typography.labelCaps}>{slotLabel}</Text>
          <Text style={[typography.bodyMuted, { fontStyle: "italic" }]}>
            {t("nutrition.logMeal")}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: space[3] }}>
      {logs.map((log) => {
        const img = log.meal_id ? imageById.get(log.meal_id) : null;
        return (
        <View key={log.id} style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
          <View style={{ width: 56, height: 56, borderRadius: radii.sm, overflow: "hidden", backgroundColor: colors.elevated }}>
            {img ? <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} /> : null}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={typography.labelCaps}>{slotLabel}</Text>
            <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 18 }} numberOfLines={2}>
              {log.name}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 13, textAlign: "right" }}>
            {log.kcal ?? 0}{"\n"}
            <Text style={typography.labelCaps}>{t("nutrition.kcal").toUpperCase()}</Text>
          </Text>
        </View>
        );
      })}
    </View>
  );
}
