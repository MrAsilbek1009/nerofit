import { useState } from "react";
import { Pressable, type PressableProps, Text } from "react-native";
import { colors, fonts, radii, space } from "@/theme";

export type ChipProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  selected?: boolean;
};

export function Chip({ label, selected = false, ...rest }: ChipProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      {...rest}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        paddingVertical: space[2],
        paddingHorizontal: space[4],
        borderRadius: radii.pill,
        backgroundColor: selected ? colors.accent : "transparent",
        borderWidth: selected ? 0 : 1,
        borderColor: colors.border,
        opacity: pressed ? 0.85 : 1,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.label,
          fontSize: 12,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: selected ? colors.canvas : colors.textHi,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
