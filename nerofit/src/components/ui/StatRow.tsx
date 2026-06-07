import { Text, View, type ViewProps } from "react-native";
import { space, typography } from "@/theme";

export type StatRowProps = ViewProps & {
  value: string;
  label: string;
  suffix?: string;
};

export function StatRow({ value, label, suffix, style, ...rest }: StatRowProps) {
  return (
    <View {...rest} style={[{ gap: space[1] }, style]}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[1] }}>
        <Text style={typography.h1}>{value}</Text>
        {suffix ? <Text style={typography.bodyMuted}>{suffix}</Text> : null}
      </View>
      <Text style={typography.labelCaps}>{label}</Text>
    </View>
  );
}
