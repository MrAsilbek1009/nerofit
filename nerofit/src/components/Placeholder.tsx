import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, space, typography } from "@/theme";

export function Placeholder({ title }: { title: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: space[5],
        }}
      >
        <Text style={typography.h1}>{title}</Text>
        <Text style={[typography.bodyMuted, { marginTop: space[2] }]}>
          Phase 1 placeholder
        </Text>
      </View>
    </SafeAreaView>
  );
}
