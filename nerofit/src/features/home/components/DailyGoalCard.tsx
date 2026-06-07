import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Card, ProgressLine } from "@/components/ui";
import { colors, fonts, radii, space, typography } from "@/theme";

export type DailyGoalCardProps = {
  current: number;
  goal: number;
  onAddWater?: () => void;
};

export function DailyGoalCard({ current, goal, onAddWater }: DailyGoalCardProps) {
  const { t } = useTranslation();
  const safeGoal = goal > 0 ? goal : 1;
  const ratio = Math.max(0, Math.min(1, current / safeGoal));
  const percent = Math.round(ratio * 100);
  const [pressed, setPressed] = useState(false);

  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space[4],
        }}
      >
        <Text style={[typography.body, { flex: 1 }]}>
          {t("home.dailyGoal", { percent })}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onAddWater}
          hitSlop={6}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.pill,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.85 : 1,
          }}
        >
          <Zap size={18} color={colors.canvas} fill={colors.canvas} />
        </Pressable>
      </View>

      <View style={{ gap: space[2], marginTop: space[3] }}>
        <Text
          style={{
            fontFamily: fonts.bodyMed,
            color: colors.textHi,
            fontSize: 13,
          }}
        >
          {t("home.waterFormat", { value: current, goal })}
        </Text>
        <ProgressLine progress={ratio} height={4} />
      </View>
    </Card>
  );
}
