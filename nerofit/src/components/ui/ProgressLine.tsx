import { View } from "react-native";
import { colors, radii } from "@/theme";

export type ProgressLineProps = {
  progress: number; // 0..1
  height?: number;
};

export function ProgressLine({ progress, height = 6 }: ProgressLineProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={{
        height,
        backgroundColor: colors.border,
        borderRadius: radii.pill,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: "100%",
          backgroundColor: colors.accent,
        }}
      />
    </View>
  );
}
