import { Image, Text, View } from "react-native";
import { colors, fonts, radii } from "@/theme";

export type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

function initials(name: string | null | undefined) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: radii.pill };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[dimension, { backgroundColor: colors.elevated }]}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[
        dimension,
        {
          backgroundColor: colors.elevated,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.label,
          color: colors.textHi,
          fontSize: size * 0.36,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
