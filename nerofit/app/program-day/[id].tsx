import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Trophy,
} from "lucide-react-native";
import { Button } from "@/components/ui";
import type { DayExerciseWithExercise } from "@/lib/api/curriculum";
import { useProgramDayDetail } from "@/lib/queries/curriculum";
import type { ProgramDayTask, ProgramSection } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

const SECTION_ORDER: ProgramSection[] = ["warmup", "main", "cooldown"];

export default function ProgramDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const detail = useProgramDayDetail(id);

  const sectionLabels: Record<ProgramSection, string> = {
    warmup: t("workouts.sectionWarmup"),
    main: t("workouts.sectionMain"),
    cooldown: t("workouts.sectionCooldown"),
  };

  const bySection = useMemo(() => {
    const map: Record<ProgramSection, DayExerciseWithExercise[]> = {
      warmup: [],
      main: [],
      cooldown: [],
    };
    for (const ex of detail.data?.exercises ?? []) {
      map[ex.section].push(ex);
    }
    return map;
  }, [detail.data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top"]}>
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
        <Text style={[typography.h2, { flex: 1 }]} numberOfLines={2}>
          {detail.data?.day.session_title ?? ""}
        </Text>
      </View>

      {detail.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : detail.error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space[4] }}>
          <Text style={typography.body}>{t("common.error")}</Text>
          <Button label={t("common.retry")} fullWidth={false} onPress={() => detail.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[7], gap: space[5] }}
          showsVerticalScrollIndicator={false}
        >
          {detail.data?.day.intro_video_script ? (
            <Text style={[typography.bodyMuted, { lineHeight: 20 }]}>
              {detail.data.day.intro_video_script}
            </Text>
          ) : null}

          {/* Tasks */}
          {(detail.data?.tasks.length ?? 0) > 0 ? (
            <View style={{ gap: space[3] }}>
              <Text style={typography.labelCaps}>{t("workouts.tasksTitle")}</Text>
              <View style={{ gap: space[2] }}>
                {detail.data!.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </View>
            </View>
          ) : null}

          {/* Exercise sections */}
          {SECTION_ORDER.map((section) => {
            const items = bySection[section];
            if (!items || items.length === 0) return null;
            return (
              <View key={section} style={{ gap: space[3] }}>
                <Text style={typography.labelCaps}>{sectionLabels[section]}</Text>
                <View style={{ gap: space[2] }}>
                  {items.map((ex) => {
                    const reps =
                      ex.sets != null && ex.reps
                        ? `${ex.sets} × ${ex.reps}`
                        : (ex.reps ?? "");
                    const detailLine = [
                      reps,
                      ex.rest_sec != null ? `${ex.rest_sec}s ${t("workouts.rest")}` : null,
                    ]
                      .filter(Boolean)
                      .join("  ·  ");
                    return (
                      <View
                        key={ex.id}
                        style={{
                          backgroundColor: colors.elevated,
                          borderRadius: radii.md,
                          paddingHorizontal: space[4],
                          paddingVertical: space[3],
                          gap: 4,
                        }}
                      >
                        <Text
                          style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }}
                        >
                          {ex.exercise?.name_uz ?? ex.exercise?.title ?? ""}
                        </Text>
                        {detailLine ? (
                          <Text style={[typography.labelCaps, { fontSize: 9, color: colors.accent }]}>
                            {detailLine}
                          </Text>
                        ) : null}
                        {ex.notes ? (
                          <Text style={[typography.bodyMuted, { fontSize: 12 }]}>{ex.notes}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TaskRow({ task }: { task: ProgramDayTask }) {
  const Icon =
    task.type === "education"
      ? GraduationCap
      : task.type === "challenge"
        ? Trophy
        : task.type === "workout"
          ? Dumbbell
          : HeartPulse;
  const meta = [
    task.duration_min != null ? `${task.duration_min} min` : null,
    task.target,
    task.reward_xp != null ? `+${task.reward_xp} XP` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        paddingHorizontal: space[4],
        paddingVertical: space[3],
      }}
    >
      <Icon size={18} color={task.optional ? colors.textLo : colors.accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 14 }}>
          {task.title}
        </Text>
        {meta ? <Text style={[typography.labelCaps, { fontSize: 9 }]}>{meta}</Text> : null}
      </View>
    </View>
  );
}
