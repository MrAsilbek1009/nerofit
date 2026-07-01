import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react-native";
import { colors, fonts, radii, space, typography } from "@/theme";

export type StepperBoxProps = {
  label: string;
  value: number;
  // Tap opens the numeric keypad for direct entry.
  onPress: () => void;
  disabled?: boolean;
};

// Reps / weight control flanking the center ring in the player. Shows a "+"
// box until a value is logged, then the number — matching the design. Tapping
// opens the keypad (which always starts at 0).
export function StepperBox({ label, value, onPress, disabled }: StepperBoxProps) {
  const { t } = useTranslation();
  return (
    <View style={{ alignItems: "center", gap: space[2], opacity: disabled ? 0.4 : 1 }}>
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={t("a11y.enterValue")} hitSlop={6}>
        {value > 0 ? (
          <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 28 }}>{value}</Text>
          </View>
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.sm,
              backgroundColor: colors.elevated,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={20} color={colors.textHi} />
          </View>
        )}
      </Pressable>
      <Text style={[typography.labelCaps, { fontSize: 9 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
