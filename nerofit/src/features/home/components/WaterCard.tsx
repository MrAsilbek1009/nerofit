import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Droplet, Plus } from "lucide-react-native";
import { ProgressRing } from "@/components/ui";
import { colors, fonts, radii, space, typography } from "@/theme";

// Carousel page 2: today's water with a ring and a quick-add button.
export function WaterCard({
  current,
  goal,
  onAdd,
}: {
  current: number;
  goal: number;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const fraction = goal > 0 ? Math.min(1, current / goal) : 0;

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
          <Droplet size={16} color={colors.fats} />
          <Text style={typography.labelCaps}>{t("nutrition.hydration")}</Text>
        </View>
        <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 30 }}>
          {current.toLocaleString()}
          <Text style={{ fontFamily: fonts.body, color: colors.textLo, fontSize: 16 }}>
            {" "}/ {goal.toLocaleString()} ml
          </Text>
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: space[4] }}>
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent,
          }}
        >
          <Plus size={20} color={colors.canvas} />
        </Pressable>
        <ProgressRing progress={fraction} size={72} strokeWidth={8} color={colors.fats}>
          <Droplet size={22} color={colors.fats} />
        </ProgressRing>
      </View>
    </View>
  );
}
