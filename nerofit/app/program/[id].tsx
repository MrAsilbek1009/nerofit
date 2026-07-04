import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Lock, Zap } from "lucide-react-native";
import { Button } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { useIsElite } from "@/hooks/useEntitlement";
import { isProgramWeekFree } from "@/features/workouts/gating";
import { useGoals } from "@/lib/queries/goals";
import { useXpTotal } from "@/lib/queries/gamification";
import { useCompletedDayIds, useProgramDays } from "@/lib/queries/curriculum";
import type { ProgramDay } from "@/types/db";
import { goBack } from "@/lib/nav";
import { colors, fonts, radii, space, typography } from "@/theme";

export default function ProgramOverviewScreen() {
  const { id, title, level } = useLocalSearchParams<{
    id: string;
    title?: string;
    level?: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();
  const isElite = useIsElite();
  const goals = useGoals(userId);
  const xp = useXpTotal(userId);
  const daysQuery = useProgramDays(id);
  const completedQuery = useCompletedDayIds(userId);
  const [showEarlier, setShowEarlier] = useState(false);

  // Refresh completion state whenever the screen regains focus (e.g. after
  // finishing a workout or marking a rest day done and navigating back).
  useFocusEffect(
    useCallback(() => {
      void completedQuery.refetch();
    }, [completedQuery]),
  );

  const completedDays = useMemo(
    () => new Set(completedQuery.data ?? []),
    [completedQuery.data],
  );

  const entryWeek = goals.data?.entry_point_week ?? 1;

  const weeks = useMemo(() => {
    const map = new Map<number, ProgramDay[]>();
    for (const d of daysQuery.data ?? []) {
      const arr = map.get(d.week_no) ?? [];
      arr.push(d);
      map.set(d.week_no, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [daysQuery.data]);

  const hasEarlier = entryWeek > 1 && weeks.some(([w]) => w < entryWeek);
  const visibleWeeks = showEarlier
    ? weeks
    : weeks.filter(([w]) => w >= entryWeek);

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
        <Pressable onPress={() => goBack(router)} hitSlop={10} accessibilityRole="button">
          <ArrowLeft size={22} color={colors.textHi} />
        </Pressable>
        <Text style={[typography.h2, { flex: 1 }]} numberOfLines={1}>
          {title ?? t("workouts.program")}
        </Text>
        {(xp.data ?? 0) > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: colors.elevated,
              borderRadius: radii.pill,
              paddingHorizontal: space[3],
              paddingVertical: space[1],
            }}
          >
            <Zap size={13} color={colors.accent} />
            <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 12 }}>
              {xp.data} XP
            </Text>
          </View>
        ) : null}
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
          {hasEarlier ? (
            <Pressable
              onPress={() => setShowEarlier((v) => !v)}
              accessibilityRole="button"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space[2],
                paddingVertical: space[1],
              }}
            >
              <ChevronDown
                size={16}
                color={colors.textLo}
                style={{ transform: [{ rotate: showEarlier ? "180deg" : "0deg" }] }}
              />
              <Text style={typography.labelCaps}>
                {showEarlier ? t("workouts.hideEarlier") : t("workouts.showEarlier")}
              </Text>
            </Pressable>
          ) : null}
          {visibleWeeks.map(([weekNo, days]) => {
            const locked = !isProgramWeekFree(level, weekNo) && !isElite;
            return (
            <View key={weekNo} style={{ gap: space[3] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
                <Text style={typography.labelCaps}>{t("workouts.week", { n: weekNo })}</Text>
                {locked ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      backgroundColor: colors.surface,
                      borderRadius: radii.pill,
                      paddingHorizontal: space[2],
                      paddingVertical: 2,
                    }}
                  >
                    <Lock size={9} color={colors.textLo} />
                    <Text
                      style={{
                        fontFamily: fonts.label,
                        fontSize: 9,
                        color: colors.textLo,
                        letterSpacing: 0.5,
                      }}
                    >
                      {t("workouts.eliteLocked")}
                    </Text>
                  </View>
                ) : weekNo === entryWeek && entryWeek > 1 ? (
                  <View
                    style={{
                      backgroundColor: colors.accent,
                      borderRadius: radii.pill,
                      paddingHorizontal: space[2],
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.label,
                        fontSize: 9,
                        color: colors.canvas,
                        letterSpacing: 0.5,
                      }}
                    >
                      {t("workouts.startHere")}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={{ gap: space[2] }}>
                {days.map((d) => (
                  <DayRow
                    key={d.id}
                    day={d}
                    completed={completedDays.has(d.id)}
                    locked={locked}
                    minLabel={t("workouts.minShort")}
                    restLabel={t("workouts.restDay")}
                    testLabel={t("workouts.testDay")}
                    onPress={() =>
                      router.push(locked ? "/paywall" : `/program-day/${d.id}`)
                    }
                  />
                ))}
              </View>
            </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DayRow({
  day,
  completed,
  locked,
  minLabel,
  restLabel,
  testLabel,
  onPress,
}: {
  day: ProgramDay;
  completed: boolean;
  locked: boolean;
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

  // Completed days (workout or rest) get the chartreuse "done" box with a
  // check. Test / milestone days stay accented to flag their importance.
  // Everything else — including rest days — reads as a plain white-numbered day.
  const accentBox = completed || day.is_test_day || day.is_milestone_day;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ checked: completed }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        paddingHorizontal: space[4],
        paddingVertical: space[3],
        opacity: locked ? 0.55 : 1,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radii.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            completed || locked
              ? "transparent"
              : accentBox
                ? colors.accent
                : colors.surface,
          borderWidth: completed ? 2 : 0,
          borderColor: completed ? colors.accent : "transparent",
        }}
      >
        {locked ? (
          <Lock size={16} color={colors.textLo} />
        ) : completed ? (
          <Check size={18} color={colors.accent} strokeWidth={2.5} />
        ) : (
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 15,
              color: accentBox ? colors.canvas : colors.textHi,
            }}
          >
            {day.day_no}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }} numberOfLines={1}>
          {day.session_title}
        </Text>
        {meta ? <Text style={[typography.labelCaps, { fontSize: 9 }]}>{meta}</Text> : null}
      </View>
      {locked ? (
        <Lock size={16} color={colors.textLo} />
      ) : (
        <ChevronRight size={18} color={colors.textLo} />
      )}
    </Pressable>
  );
}
