import { useState } from "react";
import { ActivityIndicator, Pressable, type PressableProps, Text, View } from "react-native";
import { colors, fonts, radii, space } from "@/theme";

type Variant = "primary" | "secondary";

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
  ...pressable
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...pressable}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        height: 56,
        borderRadius: radii.pill,
        paddingHorizontal: space[5],
        alignItems: "center",
        justifyContent: "center",
        opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        alignSelf: fullWidth ? "stretch" : "flex-start",
        backgroundColor: isPrimary ? colors.accent : "transparent",
        borderWidth: isPrimary ? 0 : 1,
        borderColor: isPrimary ? "transparent" : colors.border,
      }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.canvas : colors.textHi} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
          <Text style={{ fontFamily: fonts.label, fontSize: 15, letterSpacing: 0.2, color: isPrimary ? colors.canvas : colors.textHi }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
