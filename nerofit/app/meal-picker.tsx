import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import { useUserId } from "@/hooks/useUser";
import { useLogMeal, useMeals } from "@/lib/queries/nutrition";
import type { MealSlot } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export default function MealPickerScreen() {
  const params = useLocalSearchParams<{ slot?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();
  const meals = useMeals();
  const logMeal = useLogMeal(userId);

  const slot: MealSlot = SLOTS.includes(params.slot as MealSlot)
    ? (params.slot as MealSlot)
    : "snack";

  function onPick(mealId: string) {
    const meal = meals.data?.find((m) => m.id === mealId);
    if (!meal) return;
    logMeal.mutate({ meal, slot }, { onSuccess: () => router.back() });
  }

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
        <Text style={typography.labelCaps}>
          {t("nutrition.addToSlot", { slot: t(`nutrition.slots.${slot}`) })}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("a11y.close")}>
          <X size={24} color={colors.textHi} />
        </Pressable>
      </View>

      <FlatList
        data={meals.data ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: space[5], gap: space[3] }}
        ListEmptyComponent={
          meals.isLoading ? (
            <View style={{ paddingTop: space[7], alignItems: "center" }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <Text style={[typography.bodyMuted, { textAlign: "center", paddingTop: space[7] }]}>
              {t("nutrition.emptyMeals")}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPick(item.id)}
            accessibilityRole="button"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space[3],
              backgroundColor: colors.elevated,
              borderRadius: radii.md,
              padding: space[3],
            }}
          >
            <View style={{ width: 52, height: 52, borderRadius: radii.sm, overflow: "hidden", backgroundColor: colors.surface }}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={{ width: "100%", height: "100%" }} />
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }}>
                {item.name}
              </Text>
              <Text style={[typography.labelCaps, { fontSize: 10 }]}>
                {item.kcal} {t("nutrition.kcal").toUpperCase()} · {item.protein_g}
                {t("nutrition.g").toUpperCase()} P
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
