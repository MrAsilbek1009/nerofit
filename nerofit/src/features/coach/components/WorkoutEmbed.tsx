import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ChatEmbed } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

export function WorkoutEmbed({ embed }: { embed: ChatEmbed & { type: "workout" } }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/workout/${embed.id}`)}
      style={{
        borderRadius: radii.md,
        overflow: "hidden",
        backgroundColor: colors.elevated,
        height: 160,
      }}
    >
      {embed.image_url ? (
        <Image
          source={{ uri: embed.image_url }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.elevated }} />
      )}

      {/* Dark overlay */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
      />

      {/* Content */}
      <View
        style={{
          position: "absolute",
          left: space[4],
          right: space[4],
          bottom: space[3],
          gap: space[1],
        }}
      >
        {(embed.est_minutes != null || embed.category) && (
          <Text style={[typography.labelCaps, { color: colors.accent }]}>
            {[embed.est_minutes != null ? `${embed.est_minutes} MIN` : null, embed.category]
              .filter(Boolean)
              .join(" • ")}
          </Text>
        )}
        <Text
          style={{
            fontFamily: fonts.display,
            color: colors.textHi,
            fontSize: 20,
            lineHeight: 24,
          }}
          numberOfLines={2}
        >
          {embed.title}
        </Text>
      </View>
    </Pressable>
  );
}

