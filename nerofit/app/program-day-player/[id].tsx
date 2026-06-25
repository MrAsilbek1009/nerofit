import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useVideoPlayer, VideoView } from "expo-video";
import { Check, Dumbbell, X } from "lucide-react-native";
import { Button, ProgressLine, ProgressRing } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { useProgramDayDetail } from "@/lib/queries/curriculum";
import {
  useCompleteDaySession,
  useDaySession,
  useLogDayExercise,
} from "@/lib/queries/curriculumSession";
import type { DayExerciseWithExercise } from "@/lib/api/curriculum";
import type { ProgramSection } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

const SECTION_RANK: Record<ProgramSection, number> = {
  warmup: 0,
  main: 1,
  cooldown: 2,
};

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ProgramDayPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();

  const detail = useProgramDayDetail(id);
  const session = useDaySession(userId, id);
  const logMutation = useLogDayExercise(userId, id);
  const completeMutation = useCompleteDaySession();

  const steps = useMemo<DayExerciseWithExercise[]>(() => {
    return [...(detail.data?.exercises ?? [])].sort(
      (a, b) =>
        SECTION_RANK[a.section] - SECTION_RANK[b.section] ||
        a.order_index - b.order_index,
    );
  }, [detail.data]);

  const [index, setIndex] = useState(0);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = steps[index];

  // Rest countdown.
  useEffect(() => {
    if (!resting) return;
    const iv = setInterval(() => {
      setRestLeft((r) => {
        if (r <= 1) {
          setResting(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [resting]);

  // Exercise demo clip (looped, muted). Empty until videos are uploaded (W5).
  const videoUri = current?.exercise?.exercise_videos?.[0]?.url ?? null;
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    player.replace(videoUri);
    if (videoUri) player.play();
  }, [videoUri, player]);

  function advance() {
    if (index + 1 >= steps.length) {
      const sid = session.data?.id;
      if (sid) completeMutation.mutate(sid);
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
  }

  function onDone() {
    if (!current || !session.data) return;
    logMutation.mutate({
      daySessionId: session.data.id,
      programDayExerciseId: current.id,
      status: "done",
      setsDone: current.sets ?? null,
    });
    const rest = current.rest_sec ?? 0;
    if (rest > 0 && index + 1 < steps.length) {
      setRestLeft(rest);
      setResting(true);
    }
    advance();
  }

  function onSkip() {
    if (!current || !session.data) return;
    logMutation.mutate({
      daySessionId: session.data.id,
      programDayExerciseId: current.id,
      status: "skipped",
    });
    setResting(false);
    advance();
  }

  if (detail.isLoading || session.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // Completion view.
  if (finished || steps.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space[5], gap: space[4] }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.pill,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={36} color={colors.canvas} />
          </View>
          <Text style={[typography.h1, { textAlign: "center" }]}>
            {t("workouts.workoutComplete")}
          </Text>
          <Text style={[typography.bodyMuted, { textAlign: "center" }]}>
            {t("workouts.completeBody")}
          </Text>
          <Button label={t("workouts.done")} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const progress = (index + (resting ? 1 : 0)) / steps.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={{ paddingHorizontal: space[5], paddingVertical: space[3], gap: space[3] }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
            <X size={24} color={colors.textHi} />
          </Pressable>
          <Text style={typography.labelCaps}>
            {t("workouts.setOf", { current: index + 1, total: steps.length })}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ProgressLine progress={progress} height={2} />
      </View>

      {/* Media / placeholder */}
      <View style={{ height: 220, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" }}>
        {videoUri ? (
          <VideoView
            player={player}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            nativeControls={false}
          />
        ) : current?.exercise?.image_url ? (
          <Image source={{ uri: current.exercise.image_url }} style={{ width: "100%", height: "100%" }} />
        ) : (
          <Dumbbell size={48} color={colors.textLo} />
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, paddingHorizontal: space[5], paddingTop: space[5], gap: space[4] }}>
        <View style={{ gap: space[2] }}>
          <Text style={[typography.labelCaps, { color: colors.accent }]}>
            {t(`workouts.section${cap(current!.section)}`)}
          </Text>
          <Text style={[typography.display, { fontSize: 28, lineHeight: 30 }]}>
            {current?.exercise?.name_uz ?? current?.exercise?.title ?? ""}
          </Text>
          {current?.sets != null || current?.reps ? (
            <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 22 }}>
              {current?.sets != null && current?.reps
                ? `${current.sets} × ${current.reps}`
                : (current?.reps ?? "")}
            </Text>
          ) : null}
          {current?.exercise?.cues_uz ? (
            <Text style={[typography.bodyMuted, { lineHeight: 20 }]}>
              {current.exercise.cues_uz}
            </Text>
          ) : null}
          {current?.notes ? (
            <Text style={[typography.bodyMuted, { fontSize: 12 }]}>{current.notes}</Text>
          ) : null}
        </View>

        {/* Rest overlay */}
        {resting ? (
          <View style={{ alignItems: "center", gap: space[2], paddingVertical: space[3] }}>
            <View style={{ width: 110, height: 110, alignItems: "center", justifyContent: "center" }}>
              <ProgressRing progress={restLeft / (current?.rest_sec || 1)} size={110} strokeWidth={4} />
              <View style={{ position: "absolute", alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 22 }}>
                  {fmt(restLeft)}
                </Text>
                <Text style={[typography.labelCaps, { fontSize: 9 }]}>{t("workouts.rest")}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        {/* Actions */}
        <View style={{ gap: space[3], paddingBottom: space[5] }}>
          {resting ? (
            <Button label={t("workouts.markAsDone")} onPress={() => setResting(false)} />
          ) : (
            <>
              <Button
                label={`✓  ${t("workouts.markAsDone")}`}
                onPress={onDone}
                loading={logMutation.isPending}
              />
              <Button
                label={t("workouts.skipSet")}
                variant="secondary"
                onPress={onSkip}
                disabled={logMutation.isPending}
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function cap(s: ProgramSection): "Warmup" | "Main" | "Cooldown" {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as "Warmup" | "Main" | "Cooldown";
}
