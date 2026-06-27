import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react-native";
import { colors, fonts, radii, space } from "@/theme";

// Brand wordmark + day-streak pill. Replaces the plainer WelcomeHeader on the
// redesigned home.
export function HomeHeader({ streak }: { streak: number }) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.display,
          color: colors.textHi,
          fontSize: 22,
          letterSpacing: 3,
        }}
      >
        {t("brand")}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[1],
          backgroundColor: colors.elevated,
          borderRadius: radii.pill,
          paddingHorizontal: space[3],
          paddingVertical: space[1],
        }}
      >
        <Flame size={16} color={colors.streak} fill={colors.streak} />
        <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 13 }}>
          {streak}
        </Text>
      </View>
    </View>
  );
}
