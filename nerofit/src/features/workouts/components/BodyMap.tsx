import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Body, { type ExtendedBodyPart, type Slug } from "react-native-body-highlighter";
import type { GeneratorTarget } from "@/types/db";
import { colors, fonts, radii, space } from "@/theme";

// Realistic anatomical front/back muscle map (react-native-body-highlighter)
// with the selected target's muscles highlighted in chartreuse.
const TARGET_SLUGS: Record<GeneratorTarget, Slug[]> = {
  upper: ["deltoids", "chest", "biceps", "triceps", "trapezius", "forearm", "upper-back"],
  lower: ["quadriceps", "hamstring", "gluteal", "calves", "adductors"],
  core: ["abs", "obliques", "lower-back"],
  push: ["chest", "deltoids", "triceps"],
  pull: ["upper-back", "trapezius", "biceps"],
  full: [
    "deltoids", "chest", "biceps", "triceps", "trapezius", "forearm", "upper-back",
    "abs", "obliques", "lower-back", "quadriceps", "hamstring", "gluteal", "calves", "adductors",
  ],
};

export function BodyMap({ target }: { target: GeneratorTarget }) {
  const { t } = useTranslation();
  const [side, setSide] = useState<"front" | "back">("front");

  const data: ExtendedBodyPart[] = TARGET_SLUGS[target].map((slug) => ({ slug, intensity: 1 }));

  return (
    <View style={{ alignItems: "center", gap: space[3] }}>
      <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.pill, padding: 3 }}>
        <SideTab label={t("generator.front")} active={side === "front"} onPress={() => setSide("front")} />
        <SideTab label={t("generator.back")} active={side === "back"} onPress={() => setSide("back")} />
      </View>

      <Body
        data={data}
        side={side}
        gender="male"
        scale={0.9}
        colors={[colors.accent, colors.accent]}
        defaultFill={colors.elevated}
        defaultStroke={colors.border}
        defaultStrokeWidth={1}
        border="none"
      />
    </View>
  );
}

function SideTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        paddingHorizontal: space[4],
        paddingVertical: space[2],
        borderRadius: radii.pill,
        backgroundColor: active ? colors.elevated : "transparent",
      }}
    >
      <Text style={{ fontFamily: fonts.label, fontSize: 12, color: active ? colors.accent : colors.textLo }}>
        {label}
      </Text>
    </Pressable>
  );
}
