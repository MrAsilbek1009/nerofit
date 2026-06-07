import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { colors, fonts, radii, space, typography } from "@/theme";

export type ChoiceImageCardProps = {
  imageUri: string;
  title: string;
  tag?: string;
  selected: boolean;
  onPress: () => void;
  height?: number;
  showRadio?: boolean;
};

// Full-bleed photo card with a dark scrim and a title overlaid bottom-left.
// Selection is shown by the chartreuse border (+ optional radio).
export function ChoiceImageCard({
  imageUri,
  title,
  tag,
  selected,
  onPress,
  height = 120,
  showRadio = false,
}: ChoiceImageCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        height,
        borderRadius: radii.md,
        overflow: "hidden",
        backgroundColor: colors.elevated,
        borderWidth: selected ? 1 : 0,
        borderColor: selected ? colors.accent : "transparent",
      }}
    >
      <ImageBackground
        source={{ uri: imageUri }}
        resizeMode="cover"
        style={{ flex: 1 }}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]} />
        <View
          style={{
            flex: 1,
            padding: space[4],
            flexDirection: "row",
            alignItems: "flex-end",
            gap: space[3],
          }}
        >
          <View style={{ flex: 1, gap: space[1] }}>
            {tag ? (
              <Text
                style={[
                  typography.labelCaps,
                  selected ? { color: colors.accent } : null,
                ]}
              >
                {tag}
              </Text>
            ) : null}
            <Text
              style={{
                fontFamily: fonts.display,
                color: colors.textHi,
                fontSize: 20,
                textTransform: "uppercase",
              }}
            >
              {title}
            </Text>
          </View>
          {showRadio ? <Radio selected={selected} /> : null}
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: selected ? 0 : 1.5,
        borderColor: colors.textHi,
        backgroundColor: selected ? colors.accent : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected ? <Check size={13} color={colors.canvas} /> : null}
    </View>
  );
}
