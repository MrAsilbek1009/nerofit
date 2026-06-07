import { Pressable, Text, View } from "react-native";
import { colors, fonts, space, typography } from "@/theme";

export type SectionHeaderProps = {
  title: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
};

export function SectionHeader({
  title,
  onSeeAll,
  seeAllLabel = "See All",
}: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: space[2],
      }}
    >
      <Text style={typography.h2}>{title}</Text>
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text
            style={{
              fontFamily: fonts.label,
              fontSize: 12,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: colors.accent,
            }}
          >
            {seeAllLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
