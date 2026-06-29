import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Flame, Footprints } from "lucide-react-native";
import { ProgressRing } from "@/components/ui";
import { colors, fonts, radii, space, typography } from "@/theme";

// Carousel page 3 (Cal AI "page 3" top): today's steps + estimated calories
// burned. Steps come from the pedometer (0 / unavailable on the simulator).
export function ActivityCard({
  steps,
  goal,
  caloriesBurned,
}: {
  steps: number;
  goal: number;
  caloriesBurned: number;
}) {
  const { t } = useTranslation();
  const fraction = goal > 0 ? Math.min(1, steps / goal) : 0;

  return (
    <View style={{ flexDirection: "row", gap: space[3] }}>
      {/* Steps */}
      <View style={tile}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Footprints size={18} color={colors.accent} />
          <ProgressRing progress={fraction} size={40} strokeWidth={5} color={colors.accent} />
        </View>
        <View>
          <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 26 }}>
            {steps.toLocaleString()}
          </Text>
          <Text style={[typography.bodyMuted, { fontSize: 11 }]}>
            / {goal.toLocaleString()}
          </Text>
        </View>
        <Text style={[typography.labelCaps, { fontSize: 9 }]}>{t("home.stepsToday")}</Text>
      </View>

      {/* Calories burned */}
      <View style={tile}>
        <Flame size={18} color={colors.streak} />
        <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 26 }}>
          {caloriesBurned.toLocaleString()}
        </Text>
        <Text style={[typography.labelCaps, { fontSize: 9 }]}>{t("home.caloriesBurned")}</Text>
      </View>
    </View>
  );
}

const tile = {
  flex: 1,
  gap: space[3],
  backgroundColor: colors.elevated,
  borderRadius: radii.md,
  padding: space[4],
} as const;
