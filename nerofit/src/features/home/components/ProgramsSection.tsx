import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react-native";
import Body from "react-native-body-highlighter";
import { Card, Chip, SectionHeader } from "@/components/ui";
import { ProgramCard } from "@/features/workouts/components/ProgramCard";
import { usePrograms } from "@/lib/queries/programs";
import { colors, fonts, radii, space, typography } from "@/theme";

const FILTERS = ["all", "strength", "chest", "arm"] as const;
type Filter = (typeof FILTERS)[number];

export function ProgramsSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const [active, setActive] = useState<Filter>("all");
  const programs = usePrograms();

  const data = programs.data ?? [];

  return (
    <View style={{ gap: space[3] }}>
      <SectionHeader
        title={t("home.workoutPrograms")}
        seeAllLabel={t("home.seeAll")}
        onSeeAll={() => undefined}
      />

      <Pressable
        onPress={() => router.push("/workout-generator")}
        accessibilityRole="button"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[3],
          backgroundColor: colors.elevated,
          borderRadius: radii.md,
          paddingLeft: space[4],
          paddingVertical: space[4],
          paddingRight: space[2],
          overflow: "hidden",
        }}
      >
        <View style={{ flex: 1, gap: space[2] }}>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.accent,
              borderRadius: radii.pill,
              paddingHorizontal: space[2],
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontFamily: fonts.label, fontSize: 9, color: colors.canvas, letterSpacing: 0.5 }}>
              {t("generator.promoNew")}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 17, lineHeight: 21 }}>
            {t("generator.promoBannerTitle")}
          </Text>
          <Text style={[typography.bodyMuted, { fontSize: 12, lineHeight: 16 }]}>
            {t("generator.promoBannerBody")}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: space[2],
              marginTop: space[1],
              backgroundColor: colors.accent,
              borderRadius: radii.pill,
              paddingHorizontal: space[4],
              paddingVertical: space[2],
            }}
          >
            <Sparkles size={14} color={colors.canvas} />
            <Text style={{ fontFamily: fonts.label, fontSize: 13, color: colors.canvas }}>
              {t("generator.promoTitle")}
            </Text>
          </View>
        </View>
        <View style={{ width: 96, alignItems: "center", justifyContent: "center" }}>
          <Body
            data={[
              { slug: "chest", intensity: 1 },
              { slug: "deltoids", intensity: 1 },
              { slug: "biceps", intensity: 1 },
              { slug: "abs", intensity: 1 },
              { slug: "quadriceps", intensity: 1 },
            ]}
            side="front"
            gender="male"
            scale={0.42}
            colors={[colors.accent, colors.accent]}
            defaultFill={colors.surface}
            defaultStroke={colors.textLo}
            defaultStrokeWidth={0.8}
            border="none"
          />
        </View>
      </Pressable>

      <View style={{ flexDirection: "row", gap: space[2], flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={t(`home.filters.${f}`)}
            selected={active === f}
            onPress={() => setActive(f)}
          />
        ))}
      </View>

      {programs.isLoading ? (
        <Card style={{ alignItems: "center", paddingVertical: space[5] }}>
          <ActivityIndicator color={colors.accent} />
        </Card>
      ) : data.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: space[5] }}>
          <Text style={[typography.bodyMuted, { textAlign: "center" }]}>
            {t("home.empty.programs")}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: space[4] }}>
          {data.slice(0, 1).map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </View>
      )}
    </View>
  );
}
