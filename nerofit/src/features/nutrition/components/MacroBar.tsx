import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ProgressLine } from "@/components/ui";
import { colors, fonts, space, typography } from "@/theme";

export function MacroBar({
  label,
  current,
  goal,
}: {
  label: string;
  current: number;
  goal: number;
}) {
  const { t } = useTranslation();
  const safeGoal = goal > 0 ? goal : 1;
  const ratio = Math.max(0, Math.min(1, current / safeGoal));
  const percent = Math.round(ratio * 100);
  const g = t("nutrition.g").toUpperCase();

  return (
    <View style={{ gap: space[2] }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={[typography.labelCaps, { color: colors.textHi }]}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[3] }}>
          <Text style={typography.bodyMuted}>
            {current}
            {g} / {goal}
            {g}
          </Text>
          <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 13, width: 40, textAlign: "right" }}>
            {percent}%
          </Text>
        </View>
      </View>
      <ProgressLine progress={ratio} height={4} />
    </View>
  );
}
