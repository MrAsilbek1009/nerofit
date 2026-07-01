import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react-native";
import { colors, fonts, space } from "@/theme";

type StepperProps = {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
};

/**
 * Small −/＋ control for constrained numeric values (servings). Per the launch
 * rule, numbers are stepped, not typed. No shared primitive needed it yet, so
 * it lives with the scan feature.
 */
export function Stepper({
  value,
  onChange,
  step = 0.5,
  min = 0.5,
  max = 20,
  format,
}: StepperProps) {
  const { t } = useTranslation();
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[4] }}>
      <RoundButton
        icon={Minus}
        label={t("a11y.decrease")}
        disabled={value <= min}
        onPress={() => onChange(round(Math.max(min, value - step)))}
      />
      <Text
        style={{
          fontFamily: fonts.display,
          color: colors.textHi,
          fontSize: 20,
          minWidth: 48,
          textAlign: "center",
        }}
      >
        {format ? format(value) : String(value)}
      </Text>
      <RoundButton
        icon={Plus}
        label={t("a11y.increase")}
        disabled={value >= max}
        onPress={() => onChange(round(Math.min(max, value + step)))}
      />
    </View>
  );
}

function RoundButton({
  icon: Icon,
  label,
  onPress,
  disabled,
}: {
  icon: typeof Minus;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      }}
    >
      <Icon size={18} color={colors.textHi} />
    </Pressable>
  );
}
