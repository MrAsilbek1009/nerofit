import { useState } from "react";
import { Image, Pressable, type PressableProps, Text, View } from "react-native";
import { Play } from "lucide-react-native";
import { colors, fonts, radii, space, typography } from "@/theme";

export type VideoCardProps = Omit<PressableProps, "children" | "style"> & {
  title: string;
  subtitle?: string;
  imageUri?: string;
  showPlayBadge?: boolean;
  aspectRatio?: number; // width / height
};

export function VideoCard({
  title,
  subtitle,
  imageUri,
  showPlayBadge = true,
  aspectRatio = 4 / 5,
  ...rest
}: VideoCardProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        borderRadius: radii.md,
        overflow: "hidden",
        backgroundColor: colors.elevated,
        aspectRatio,
        opacity: pressed ? 0.9 : 1,
      }}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.elevated }} />
      )}

      <View
        style={{
          position: "absolute",
          left: space[4],
          right: space[4],
          bottom: space[4],
          gap: space[1],
        }}
      >
        {subtitle ? (
          <Text style={[typography.labelCaps, { color: colors.textHi, opacity: 0.8 }]}>
            {subtitle}
          </Text>
        ) : null}
        <Text
          style={{
            fontFamily: fonts.display,
            color: colors.textHi,
            fontSize: 24,
            lineHeight: 28,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>

      {showPlayBadge ? (
        <View
          style={{
            position: "absolute",
            right: space[4],
            top: space[4],
            width: 36,
            height: 36,
            borderRadius: radii.pill,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Play size={16} color={colors.canvas} fill={colors.canvas} />
        </View>
      ) : null}
    </Pressable>
  );
}
