import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, Chip, SectionHeader } from "@/components/ui";
import { ProgramCard } from "@/features/workouts/components/ProgramCard";
import { usePrograms } from "@/lib/queries/programs";
import { colors, space, typography } from "@/theme";

const FILTERS = ["all", "strength", "chest", "arm"] as const;
type Filter = (typeof FILTERS)[number];

export function ProgramsSection() {
  const { t } = useTranslation();
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
