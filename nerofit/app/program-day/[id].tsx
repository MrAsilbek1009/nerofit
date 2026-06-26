import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Trophy,
} from "lucide-react-native";
import { Button } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import type { DayExerciseWithExercise } from "@/lib/api/curriculum";
import { useCompletedDayIds, useProgramDayDetail } from "@/lib/queries/curriculum";
import {
  useCompleteDaySession,
  useDaySession,
} from "@/lib/queries/curriculumSession";
import {
  useDayTestResults,
  useLogTestResult,
  useSessionTaskCompletions,
  useToggleTaskCompletion,
} from "@/lib/queries/gamification";
import { noWebOutline } from "@/lib/style";
import type {
  ProgramDayTask,
  ProgramDayTest,
  ProgramSection,
} from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

const SECTION_ORDER: ProgramSection[] = ["warmup", "main", "cooldown"];

export default function ProgramDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const detail = useProgramDayDetail(id);
  const userId = useUserId();
  const session = useDaySession(userId, id);
  const completions = useSessionTaskCompletions(session.data?.id);
  const toggleTask = useToggleTaskCompletion(userId, session.data?.id);
  const doneIds = new Set(completions.data ?? []);

  const testIds = useMemo(
    () => (detail.data?.tests ?? []).map((x) => x.id),
    [detail.data],
  );
  const testResults = useDayTestResults(id, testIds);
  const logTest = useLogTestResult(userId, id);

  const completedIds = useCompletedDayIds(userId);
  const completeDay = useCompleteDaySession();
  const isRestDay = detail.data?.day.is_rest_day ?? false;
  const hasExercises = (detail.data?.exercises.length ?? 0) > 0;
  const dayCompleted = (completedIds.data ?? []).includes(id);

  function markRestComplete() {
    const sid = session.data?.id;
    if (!sid) return;
    completeDay.mutate(sid, {
      onSuccess: () => {
        void completedIds.refetch();
        router.back();
      },
    });
  }

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
        <>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[5], gap: space[5] }}
          showsVerticalScrollIndicator={false}
        >
          {detail.data?.day.is_milestone_day ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space[3],
                backgroundColor: colors.accent,
                borderRadius: radii.md,
                paddingHorizontal: space[4],
                paddingVertical: space[3],
              }}
            >
              <Trophy size={20} color={colors.canvas} />
              <Text style={{ flex: 1, fontFamily: fonts.bodyMed, color: colors.canvas, fontSize: 14 }}>
                {t("workouts.milestone")}
              </Text>
            </View>
          ) : null}
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
                  <TaskRow
                    key={task.id}
                    task={task}
                    done={doneIds.has(task.id)}
                    onToggle={() =>
                      toggleTask.mutate({
                        taskId: task.id,
                        done: !doneIds.has(task.id),
                      })
                    }
                  />
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
                        {ex.adapted ? (
                          <View
                            style={{
                              alignSelf: "flex-start",
                              borderWidth: 1,
                              borderColor: colors.accent,
                              borderRadius: radii.pill,
                              paddingHorizontal: space[2],
                              paddingVertical: 1,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: fonts.label,
                                fontSize: 8.5,
                                color: colors.accent,
                                letterSpacing: 0.5,
                              }}
                            >
                              {t("workouts.adapted")}
                            </Text>
                          </View>
                        ) : null}
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

          {(detail.data?.tests.length ?? 0) > 0 ? (
            <View style={{ gap: space[3] }}>
              <Text style={typography.labelCaps}>{t("workouts.testDay")}</Text>
              <View style={{ gap: space[2] }}>
                {detail.data!.tests.map((test) => (
                  <TestRow
                    key={test.id}
                    test={test}
                    initial={testResults.data?.[test.id]}
                    unit={t(`workouts.testUnit.${test.log_type}`)}
                    saveLabel={t("workouts.saveResult")}
                    onSave={(v) => logTest.mutate({ testId: test.id, value: v })}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
        {hasExercises ? (
          <View style={{ paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[5] }}>
            <Button
              label={t("workouts.startWorkout")}
              onPress={() => router.push(`/program-day-player/${id}`)}
            />
          </View>
        ) : isRestDay ? (
          <View style={{ paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[5] }}>
            {dayCompleted ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: space[2],
                  paddingVertical: space[3],
                }}
              >
                <Check size={18} color={colors.accent} />
                <Text style={[typography.labelCaps, { color: colors.accent }]}>
                  {t("workouts.restCompleted")}
                </Text>
              </View>
            ) : (
              <Button
                label={t("workouts.markRestComplete")}
                onPress={markRestComplete}
                loading={completeDay.isPending}
                disabled={!session.data}
              />
            )}
          </View>
        ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

function TaskRow({
  task,
  done,
  onToggle,
}: {
  task: ProgramDayTask;
  done: boolean;
  onToggle: () => void;
}) {
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
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ checked: done }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        paddingHorizontal: space[4],
        paddingVertical: space[3],
        opacity: done ? 0.65 : 1,
      }}
    >
      <Icon size={18} color={task.optional ? colors.textLo : colors.accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontFamily: fonts.bodyMed,
            color: colors.textHi,
            fontSize: 14,
            textDecorationLine: done ? "line-through" : "none",
          }}
        >
          {task.title}
        </Text>
        {meta ? <Text style={[typography.labelCaps, { fontSize: 9 }]}>{meta}</Text> : null}
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: done ? 0 : 2,
          borderColor: done ? "transparent" : colors.textLo,
          backgroundColor: done ? colors.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? <Check size={13} color={colors.canvas} /> : null}
      </View>
    </Pressable>
  );
}

function TestRow({
  test,
  initial,
  unit,
  saveLabel,
  onSave,
}: {
  test: ProgramDayTest;
  initial?: number;
  unit: string;
  saveLabel: string;
  onSave: (value: number) => void;
}) {
  const [val, setVal] = useState("");
  useEffect(() => {
    if (initial != null) setVal(String(initial));
  }, [initial]);

  function save() {
    const n = Number(val);
    if (val.trim() !== "" && Number.isFinite(n)) onSave(n);
  }

  return (
    <View
      style={{
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        paddingHorizontal: space[4],
        paddingVertical: space[3],
        gap: space[2],
      }}
    >
      <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 14 }}>
        {test.name}
      </Text>
      {test.instructions ? (
        <Text style={[typography.bodyMuted, { fontSize: 12 }]}>{test.instructions}</Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
        <TextInput
          value={val}
          onChangeText={setVal}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textLo}
          onSubmitEditing={save}
          style={[
            {
              flex: 1,
              fontFamily: fonts.display,
              color: colors.textHi,
              fontSize: 22,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingVertical: space[1],
            },
            noWebOutline,
          ]}
        />
        <Text style={typography.labelCaps}>{unit}</Text>
        <Pressable
          onPress={save}
          accessibilityRole="button"
          style={{
            backgroundColor: colors.accent,
            borderRadius: radii.pill,
            paddingHorizontal: space[4],
            paddingVertical: space[2],
          }}
        >
          <Text style={{ fontFamily: fonts.label, color: colors.canvas, fontSize: 13 }}>
            {saveLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
