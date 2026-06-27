import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react-native";
import { ProgressRing } from "@/components/ui";
import { colors, fonts, radii, space, typography } from "@/theme";

// Big "calories left" ring. The ring fills as the day's calories are consumed.
export function CaloriesCard({ left, fraction }: { left: number; fraction: number }) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        padding: space[5],
      }}
    >
      <View style={{ gap: space[1] }}>
        <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 44 }}>
          {left.toLocaleString()}
        </Text>
        <Text style={typography.labelCaps}>{t("home.caloriesLeft")}</Text>
      </View>

      <ProgressRing progress={fraction} size={96} strokeWidth={9}>
        <Flame size={26} color={colors.accent} />
      </ProgressRing>
    </View>
  );
}
