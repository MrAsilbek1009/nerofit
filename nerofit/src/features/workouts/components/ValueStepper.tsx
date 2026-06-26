import { Pressable, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { colors, fonts, radii, space, typography } from "@/theme";

export type ValueStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  // Tap the value to open the number pad for direct entry.
  onPressValue?: () => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string | null;
  disabled?: boolean;
};

// Compact +/- stepper for reps / weight. The number is tappable to open the
// numeric keypad; the round buttons nudge by `step`.
export function ValueStepper({
  label,
  value,
  onChange,
  onPressValue,
  step = 1,
  min = 0,
  max = 999,
  suffix,
  disabled,
}: ValueStepperProps) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <View style={{ alignItems: "center", gap: space[2], opacity: disabled ? 0.4 : 1 }}>
      <RoundButton disabled={disabled} onPress={() => onChange(clamp(value + step))}>
        <Plus size={18} color={colors.textHi} />
      </RoundButton>
      <Pressable
        onPress={onPressValue}
        disabled={disabled || !onPressValue}
        accessibilityRole="button"
        hitSlop={8}
      >
        <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 26, textAlign: "center" }}>
          {value}
        </Text>
      </Pressable>
      <RoundButton disabled={disabled} onPress={() => onChange(clamp(value - step))}>
        <Minus size={18} color={colors.textHi} />
      </RoundButton>
      <Text style={[typography.labelCaps, { fontSize: 9 }]} numberOfLines={1}>
        {suffix ? `${label} · ${suffix}` : label}
      </Text>
    </View>
  );
}

function RoundButton({
  onPress,
  disabled,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={{
        width: 40,
        height: 40,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.elevated,
      }}
    >
      {children}
    </Pressable>
  );
}
