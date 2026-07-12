import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react-native";
import { colors, fonts, radii, space } from "@/theme";

// Brand wordmark + day-streak pill (tap → streak modal, Cal AI "View streak").
export function HomeHeader({
  streak,
  onStreakPress,
}: {
  streak: number;
  onStreakPress?: () => void;
}) {
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

      <Pressable
        onPress={onStreakPress}
        disabled={!onStreakPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("home.streakA11y", { count: streak })}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: space[1],
          backgroundColor: colors.elevated,
          borderRadius: radii.pill,
          paddingHorizontal: space[3],
          paddingVertical: space[1],
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Flame size={16} color={colors.streak} fill={colors.streak} />
        <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 13 }}>
          {streak}
        </Text>
      </Pressable>
    </View>
  );
}
