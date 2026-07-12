import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import { Button } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { useSaveManualGoals } from "@/lib/queries/adaptiveGoals";
import { useProfile } from "@/lib/queries/profile";
import { colors, fonts, radii, space, typography } from "@/theme";

/**
 * Manual macro-goal editor (Cal AI "Editing daily goals"). The derived kcal
 * updates live; saving records a "manual" nutrition_targets row so the weekly
 * adaptive recompute steps from the user's number instead of fighting it.
 */
export default function EditGoalsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();

  const profile = useProfile(userId);
  const save = useSaveManualGoals(userId);

  const [protein, setProtein] = useState(String(profile.data?.protein_goal_g ?? 200));
  const [carbs, setCarbs] = useState(String(profile.data?.carbs_goal_g ?? 300));
  const [fats, setFats] = useState(String(profile.data?.fats_goal_g ?? 80));

  const p = parseInt(protein, 10) || 0;
  const c = parseInt(carbs, 10) || 0;
  const f = parseInt(fats, 10) || 0;
  const kcal = Math.round(p * 4 + c * 4 + f * 9);
  const valid = p > 0 && c >= 0 && f > 0;

  function submit() {
    if (!valid) return;
    save.mutate(
      { protein_g: p, carbs_g: c, fats_g: f },
      { onSuccess: () => router.back() },
    );
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
        <Text style={typography.labelCaps}>{t("nutrition.editGoals.title")}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("a11y.close")}>
          <X size={24} color={colors.textHi} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space[5], gap: space[6] }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Derived kcal, live */}
        <View>
          <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 44 }}>
            {kcal}
          </Text>
          <Text style={typography.labelCaps}>{t("nutrition.editGoals.derived")}</Text>
        </View>

        <View style={{ gap: space[4] }}>
          <GoalField label={t("nutrition.protein")} value={protein} onChange={setProtein} />
          <GoalField label={t("nutrition.carbs")} value={carbs} onChange={setCarbs} />
          <GoalField label={t("nutrition.fats")} value={fats} onChange={setFats} />
        </View>

        <Text style={typography.bodyMuted}>{t("nutrition.editGoals.adaptiveNote")}</Text>

        <Button
          label={t("nutrition.editGoals.save")}
          loading={save.isPending}
          disabled={!valid}
          onPress={submit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: space[4],
      }}
    >
      <Text style={[typography.labelCaps, { color: colors.textHi }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          maxLength={3}
          style={{
            fontFamily: fonts.display,
            color: colors.textHi,
            fontSize: 20,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.sm,
            paddingHorizontal: space[3],
            paddingVertical: space[2],
            minWidth: 76,
            textAlign: "center",
          }}
        />
        <Text style={typography.labelCaps}>{t("nutrition.g").toUpperCase()}</Text>
      </View>
    </View>
  );
}
