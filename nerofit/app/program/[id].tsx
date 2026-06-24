import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { Button } from "@/components/ui";
import { useProgramDays } from "@/lib/queries/curriculum";
import type { ProgramDay } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function ProgramOverviewScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const daysQuery = useProgramDays(id);

  const weeks = useMemo(() => {
    const map = new Map<number, ProgramDay[]>();
    for (const d of daysQuery.data ?? []) {
      const arr = map.get(d.week_no) ?? [];
      arr.push(d);
      map.set(d.week_no, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [daysQuery.data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[3],
          paddingHorizontal: space[5],
          paddingVertical: space[3],
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <ArrowLeft size={22} color={colors.textHi} />
        </Pressable>
        <Text style={[typography.h2, { flex: 1 }]} numberOfLines={1}>
          {title ?? t("workouts.program")}
        </Text>
      </View>

      {daysQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : daysQuery.error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space[4] }}>
          <Text style={typography.body}>{t("common.error")}</Text>
          <Button label={t("common.retry")} fullWidth={false} onPress={() => daysQuery.refetch()} />
        </View>
      ) : weeks.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={typography.bodyMuted}>{t("workouts.empty")}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[7], gap: space[5] }}
          showsVerticalScrollIndicator={false}
        >
          {weeks.map(([weekNo, days]) => (
            <View key={weekNo} style={{ gap: space[3] }}>
              <Text style={typography.labelCaps}>{t("workouts.week", { n: weekNo })}</Text>
              <View style={{ gap: space[2] }}>
                {days.map((d) => (
                  <DayRow
                    key={d.id}
                    day={d}
                    minLabel={t("workouts.minShort")}
                    restLabel={t("workouts.restDay")}
                    testLabel={t("workouts.testDay")}
                    onPress={() => router.push(`/program-day/${d.id}`)}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DayRow({
  day,
  minLabel,
  restLabel,
  testLabel,
  onPress,
}: {
  day: ProgramDay;
  minLabel: string;
  restLabel: string;
  testLabel: string;
  onPress: () => void;
}) {
  const meta = [
    day.weekday,
    day.is_rest_day ? restLabel : null,
    day.is_test_day ? testLabel : null,
    !day.is_rest_day && day.total_duration_min != null
      ? `${day.total_duration_min} ${minLabel}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const accent = day.is_test_day || day.is_milestone_day;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        paddingHorizontal: space[4],
        paddingVertical: space[3],
        opacity: day.is_rest_day ? 0.7 : 1,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radii.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: accent ? colors.accent : colors.surface,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 15,
            color: accent ? colors.canvas : colors.textHi,
          }}
        >
          {day.day_no}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }} numberOfLines={1}>
          {day.session_title}
        </Text>
        {meta ? <Text style={[typography.labelCaps, { fontSize: 9 }]}>{meta}</Text> : null}
      </View>
      <ChevronRight size={18} color={colors.textLo} />
    </Pressable>
  );
}
