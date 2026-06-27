import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ProgressRing } from "@/components/ui";
import { colors, fonts, radii, space } from "@/theme";

type Macro = { left: number; fraction: number };

// Three "macro left" cards with coloured mini rings (the hybrid colour accents).
export function MacroGauges({
  protein,
  carbs,
  fats,
}: {
  protein: Macro;
  carbs: Macro;
  fats: Macro;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: "row", gap: space[3] }}>
      <MacroCard label={t("nutrition.protein")} color={colors.protein} {...protein} />
      <MacroCard label={t("nutrition.carbs")} color={colors.carbs} {...carbs} />
      <MacroCard label={t("nutrition.fats")} color={colors.fats} {...fats} />
    </View>
  );
}

function MacroCard({
  label,
  color,
  left,
  fraction,
}: Macro & { label: string; color: string }) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flex: 1,
        gap: space[3],
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        padding: space[4],
      }}
    >
      <View style={{ gap: 2 }}>
        <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 18 }}>
          {left}
          {t("nutrition.g")}
        </Text>
        <Text style={{ fontFamily: fonts.label, fontSize: 10, color: colors.textLo }}>
          {label} {t("home.left")}
        </Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <ProgressRing progress={fraction} size={48} strokeWidth={5} color={color} />
      </View>
    </View>
  );
}
