import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NutritionTarget } from "@/lib/api/nutritionTargets";
import { colors, fonts, radii, space, typography } from "@/theme";

/**
 * Adherence-neutral "plan updated" notice shown for a few days after the
 * weekly adaptive recompute (MacroFactor tone: no red, no guilt — just the
 * new number and move on). White/gray only; accent discipline keeps this
 * card quiet.
 */
export function PlanUpdatedCard({ target }: { target: NutritionTarget }) {
  const { t } = useTranslation();
  const g = t("nutrition.g").toUpperCase();

  return (
    <View
      style={{
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        padding: space[4],
        gap: space[2],
      }}
    >
      <Text style={typography.labelCaps}>{t("nutrition.adaptive.updated")}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 32 }}>
            {target.kcal}
          </Text>
          <Text style={typography.labelCaps}>{t("nutrition.adaptive.kcalPerDay")}</Text>
        </View>
        <Text style={[typography.labelCaps, { fontSize: 10 }]}>
          {t("nutrition.adaptive.tdee", { kcal: target.tdee_kcal })}
          {"  ·  "}
          {target.protein_g}
          {g} P · {target.carbs_g}
          {g} C · {target.fats_g}
          {g} F
        </Text>
      </View>
      <Text style={typography.bodyMuted}>{t("nutrition.adaptive.keepGoing")}</Text>
    </View>
  );
}
