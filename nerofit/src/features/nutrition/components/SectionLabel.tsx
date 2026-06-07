import { Text, View } from "react-native";
import { colors, space, typography } from "@/theme";

// Section label with a thin rule extending to the right edge (Nutrition mock).
export function SectionLabel({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
      <Text style={typography.labelCaps}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}
