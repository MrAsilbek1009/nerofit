import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Flame, MoreVertical, Timer, X } from "lucide-react-native";
import { Button, ProgressLine } from "@/components/ui";
import {
  ExerciseRow,
  type ExerciseRowStatus,
} from "@/features/workouts/components/ExerciseRow";
import type { WorkoutExerciseDetail } from "@/lib/api/workouts";
import { useUserId } from "@/hooks/useUser";
import { useWorkoutDetail } from "@/lib/queries/workoutDetail";
import {
  useActiveSession,
  useCompleteSession,
  useLogExercise,
} from "@/lib/queries/session";
import type { LogStatus } from "@/types/db";
import { colors, fonts, space, typography } from "@/theme";

function repsToNumber(reps: string): number | null {
  const n = Number.parseInt(reps, 10);
  return Number.isFinite(n) ? n : null;
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();

  const detailQuery = useWorkoutDetail(id);
  const sessionQuery = useActiveSession(userId, id);
  const logMutation = useLogExercise(userId, id);
  const completeMutation = useCompleteSession(userId, id);

  const detail = detailQuery.data;
  const session = sessionQuery.data;

  // exerciseId → log status
  const logByExercise = new Map<string, LogStatus>();
  for (const log of session?.exercise_logs ?? []) {
    logByExercise.set(log.exercise_id, log.status);
  }

  const exercises = detail?.workout_exercises ?? [];
  const currentId = exercises.find(
    (we) => !logByExercise.has(we.exercise_id),
  )?.id;
  const loggedCount = exercises.filter((we) =>
    logByExercise.has(we.exercise_id),
  ).length;
  const progress = exercises.length ? loggedCount / exercises.length : 0;
  const allLogged = exercises.length > 0 && loggedCount === exercises.length;

  // Auto-complete the session once every exercise is logged.
  useEffect(() => {
    if (
      allLogged &&
      session &&
      session.status === "active" &&
      !completeMutation.isPending
    ) {
      completeMutation.mutate(session.id);
    }
  }, [allLogged, session, completeMutation]);

  function statusFor(we: WorkoutExerciseDetail): ExerciseRowStatus {
    const log = logByExercise.get(we.exercise_id);
    if (log === "done") return "done";
    if (log === "skipped") return "skipped";
    if (we.id === currentId) return "current";
    return "pending";
  }

  function openPlayer(we: WorkoutExerciseDetail) {
    if (!session) return;
    router.push(
      `/exercise/${we.id}?workoutId=${id}&sessionId=${session.id}`,
    );
  }

  function markDone(we: WorkoutExerciseDetail) {
    if (!session) return;
    logMutation.mutate({
      sessionId: session.id,
      exerciseId: we.exercise_id,
      status: "done",
      setsDone: we.sets,
      repsDone: repsToNumber(we.reps),
    });
  }

  const loading = detailQuery.isLoading || sessionQuery.isLoading;
  const error = detailQuery.error ?? sessionQuery.error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: space[5],
          paddingVertical: space[3],
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
          <X size={24} color={colors.textHi} />
        </Pressable>
        <Text
          style={{
            fontFamily: fonts.display,
            color: colors.accent,
            fontSize: 18,
            letterSpacing: 2,
          }}
        >
          {(detail?.program?.level ?? "").toUpperCase()}
        </Text>
        <Pressable hitSlop={10} accessibilityRole="button">
          <MoreVertical size={22} color={colors.textHi} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error || !detail ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: space[4],
            padding: space[5],
          }}
        >
          <Text style={typography.body}>{t("common.error")}</Text>
          <Button
            label={t("common.retry")}
            fullWidth={false}
            onPress={() => {
              void detailQuery.refetch();
              void sessionQuery.refetch();
            }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: space[5],
            paddingBottom: space[7],
            gap: space[5],
          }}
        >
          {/* Title + meta */}
          <View style={{ gap: space[3] }}>
            <Text
              style={[typography.display, { fontSize: 38, lineHeight: 40, textTransform: "uppercase" }]}
            >
              {detail.title}
            </Text>
            <View style={{ flexDirection: "row", gap: space[4] }}>
              {detail.est_minutes != null ? (
                <Meta icon={<Timer size={14} color={colors.textLo} />} text={`${detail.est_minutes} ${t("workouts.minShort").toUpperCase()}`} />
              ) : null}
              {detail.est_kcal != null ? (
                <Meta icon={<Flame size={14} color={colors.textLo} />} text={`${detail.est_kcal} ${t("workouts.kcalShort").toUpperCase()}`} />
              ) : null}
            </View>
            <ProgressLine progress={progress} height={3} />
          </View>

          {/* Exercise list */}
          <View style={{ gap: space[3] }}>
            {exercises.map((we) => (
              <ExerciseRow
                key={we.id}
                detail={we}
                status={statusFor(we)}
                onOpen={() => openPlayer(we)}
                onMarkDone={() => markDone(we)}
                marking={logMutation.isPending}
              />
            ))}
          </View>

          {allLogged ? (
            <View style={{ alignItems: "center", gap: space[2], paddingTop: space[3] }}>
              <Text style={typography.h2}>{t("workouts.workoutComplete")}</Text>
              <Text style={[typography.bodyMuted, { textAlign: "center" }]}>
                {t("workouts.completeBody")}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[1] }}>
      {icon}
      <Text style={typography.labelCaps}>{text}</Text>
    </View>
  );
}
