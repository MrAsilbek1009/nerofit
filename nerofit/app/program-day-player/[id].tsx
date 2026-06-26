import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useVideoPlayer, VideoView } from "expo-video";
import { Check, Dumbbell, MoreHorizontal, Pause, Play, X } from "lucide-react-native";
import { Button, ProgressRing } from "@/components/ui";
import { NumberPad } from "@/features/workouts/components/NumberPad";
import { ValueStepper } from "@/features/workouts/components/ValueStepper";
import { WorkoutSettingsSheet } from "@/features/workouts/components/WorkoutSettingsSheet";
import { parseReps } from "@/features/workouts/repsParse";
import { useUserId } from "@/hooks/useUser";
import { useProgramDayDetail } from "@/lib/queries/curriculum";
import {
  useCompleteDaySession,
  useDaySession,
  useLogDayExercise,
} from "@/lib/queries/curriculumSession";
import { useWorkoutSettings } from "@/store/workoutSettings";
import type { DayExerciseWithExercise } from "@/lib/api/curriculum";
import type { ProgramSection } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

const SECTION_RANK: Record<ProgramSection, number> = {
  warmup: 0,
  main: 1,
  cooldown: 2,
};

// Player phase for the current exercise step.
type Mode = "ready" | "active" | "rest";

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
  const [mode, setMode] = useState<Mode>("ready");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [reps, setReps] = useState(0);
  const [weight, setWeight] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pad, setPad] = useState<null | "reps" | "weight">(null);

  // Live settings (re-render on toggle).
  const autoPilot = useWorkoutSettings((s) => s.autoPilot);

  const current = steps[index];
  const target = useMemo(() => parseReps(current?.reps), [current]);
  const isTimed = target.kind === "time";
  const showWeight =
    !!current?.exercise?.equipment_tier &&
    current.exercise.equipment_tier !== "bodyweight";
  const restBase = current?.rest_sec ?? 0;

  // Initialise the first step once the plan loads.
  useEffect(() => {
    if (started || steps.length === 0) return;
    setStarted(true);
    enterStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, started]);

  function enterStep(i: number) {
    const next = steps[i];
    if (!next) {
      finish();
      return;
    }
    const tgt = parseReps(next.reps);
    setIndex(i);
    setReps(tgt.kind === "reps" ? (tgt.value ?? 10) : 0);
    setWeight(0);
    if (useWorkoutSettings.getState().exerciseIntro) {
      setMode("ready");
    } else {
      setMode("active");
      setSecondsLeft(tgt.kind === "time" ? (tgt.value ?? 0) : 0);
    }
  }

  function begin() {
    setMode("active");
    setSecondsLeft(isTimed ? (target.value ?? 0) : 0);
  }

  function finish() {
    const sid = session.data?.id;
    if (sid) completeMutation.mutate(sid);
    setFinished(true);
  }

  function goToStep(i: number) {
    if (i >= steps.length) {
      finish();
      return;
    }
    enterStep(i);
  }

  function logCurrent(status: "done" | "skipped") {
    if (!current || !session.data) return;
    logMutation.mutate({
      daySessionId: session.data.id,
      programDayExerciseId: current.id,
      status,
      setsDone: current.sets ?? 1,
      repsDone: isTimed || status === "skipped" ? null : reps,
      weightUsed: showWeight && status === "done" ? weight : null,
    });
  }

  function completeActive() {
    logCurrent("done");
    if (restBase > 0 && index + 1 < steps.length) {
      setMode("rest");
      setSecondsLeft(restBase);
    } else {
      goToStep(index + 1);
    }
  }

  function skipActive() {
    logCurrent("skipped");
    goToStep(index + 1);
  }

  // Countdown ticker — runs for the work timer (timed exercises) and rest.
  useEffect(() => {
    if (paused) return;
    const counting = mode === "rest" || (mode === "active" && isTimed);
    if (!counting) return;
    const iv = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [paused, mode, isTimed]);

  // Handle a countdown reaching zero.
  useEffect(() => {
    if (secondsLeft !== 0) return;
    if (mode === "rest") {
      goToStep(index + 1);
    } else if (mode === "active" && isTimed) {
      if (autoPilot) completeActive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, mode, autoPilot]);

  // Total elapsed workout time.
  useEffect(() => {
    if (paused || finished) return;
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(iv);
  }, [paused, finished]);

  // Exercise demo clip (looped, muted). Empty until videos are uploaded.
  const videoUri = current?.exercise?.exercise_videos?.[0]?.url ?? null;
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    player.replace(videoUri);
    if (videoUri && mode === "active" && !paused) player.play();
  }, [videoUri, player, mode, paused]);

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
          <Text style={typography.labelCaps}>{fmt(elapsed)}</Text>
          <Button label={t("workouts.done")} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const exerciseName = current?.exercise?.name_uz ?? current?.exercise?.title ?? "";
  const nextStep = steps[index + 1];
  const nextName = nextStep?.exercise?.name_uz ?? nextStep?.exercise?.title ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top", "bottom"]}>
      {/* Header: pause · elapsed · settings */}
      <View style={{ paddingHorizontal: space[5], paddingVertical: space[3], gap: space[3] }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => setPaused(true)} hitSlop={10} accessibilityRole="button">
            <Pause size={22} color={colors.textHi} />
          </Pressable>
          <Text style={typography.labelCaps}>{fmt(elapsed)}</Text>
          <Pressable onPress={() => setSettingsOpen(true)} hitSlop={10} accessibilityRole="button">
            <MoreHorizontal size={22} color={colors.textHi} />
          </Pressable>
        </View>
        {/* Progress segments */}
        <View style={{ flexDirection: "row", gap: 4 }}>
          {steps.map((s, i) => (
            <View
              key={s.id}
              style={{
                flex: 1,
                height: 3,
                borderRadius: radii.pill,
                backgroundColor: i < index ? colors.accent : i === index ? colors.textLo : colors.border,
              }}
            />
          ))}
        </View>
      </View>

      {mode === "ready" ? (
        // "Get ready for …" + tap to begin.
        <Pressable onPress={begin} style={{ flex: 1, paddingHorizontal: space[5], justifyContent: "center" }}>
          <View style={{ gap: space[2] }}>
            <Text style={[typography.labelCaps, { color: colors.accent }]}>
              {t(`workouts.section${cap(current!.section)}`)}
            </Text>
            <Text style={typography.bodyMuted}>{t("workouts.getReadyFor")}</Text>
            <Text style={[typography.display, { fontSize: 40, lineHeight: 42, textTransform: "uppercase" }]}>
              {exerciseName}
            </Text>
            <Text style={[typography.labelCaps, { marginTop: space[2] }]}>{target.raw}</Text>
          </View>
          <View style={{ position: "absolute", bottom: space[6], left: 0, right: 0, alignItems: "center" }}>
            <Text style={typography.labelCaps}>{t("workouts.swipeToBegin")}</Text>
          </View>
        </Pressable>
      ) : (
        <>
          {/* Media */}
          <View style={{ height: 200, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" }}>
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
          <View style={{ flex: 1, paddingHorizontal: space[5], paddingTop: space[4], gap: space[4] }}>
            <View style={{ gap: space[1] }}>
              <Text style={[typography.labelCaps, { color: colors.accent }]}>
                {t("workouts.setOf", { current: index + 1, total: steps.length })}
              </Text>
              <Text style={[typography.display, { fontSize: 26, lineHeight: 28 }]}>{exerciseName}</Text>
              {current?.exercise?.cues_uz && mode === "active" ? (
                <Text style={[typography.bodyMuted, { fontSize: 12, lineHeight: 18 }]} numberOfLines={2}>
                  {current.exercise.cues_uz}
                </Text>
              ) : null}
            </View>

            {/* Focal: timer ring (timed / rest) or rep target */}
            <View style={{ alignItems: "center", gap: space[4], paddingTop: space[2] }}>
              {mode === "rest" || isTimed ? (
                <View style={{ width: 150, height: 150, alignItems: "center", justifyContent: "center" }}>
                  <ProgressRing
                    progress={
                      mode === "rest"
                        ? secondsLeft / (restBase || 1)
                        : secondsLeft / (target.value || 1)
                    }
                    size={150}
                    strokeWidth={5}
                  />
                  <View style={{ position: "absolute", alignItems: "center" }}>
                    <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 34 }}>
                      {fmt(secondsLeft)}
                    </Text>
                    <Text style={typography.labelCaps}>
                      {mode === "rest"
                        ? t("workouts.rest")
                        : t(`workouts.section${cap(current!.section)}`)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 72, lineHeight: 76 }}>
                    {reps}
                  </Text>
                  <Text style={[typography.labelCaps, { color: colors.accent }]}>{t("workouts.reps")}</Text>
                </View>
              )}

              {/* Steppers (active only) */}
              {mode === "active" ? (
                <View style={{ flexDirection: "row", gap: space[6], justifyContent: "center" }}>
                  {!isTimed ? (
                    <ValueStepper
                      label={t("workouts.reps")}
                      value={reps}
                      onChange={setReps}
                      onPressValue={() => setPad("reps")}
                    />
                  ) : null}
                  {showWeight ? (
                    <ValueStepper
                      label={t("workouts.weight")}
                      value={weight}
                      onChange={setWeight}
                      onPressValue={() => setPad("weight")}
                      suffix="kg"
                    />
                  ) : null}
                </View>
              ) : null}
            </View>

            {nextName && mode === "active" ? (
              <Text style={[typography.labelCaps, { textAlign: "center" }]} numberOfLines={1}>
                {t("workouts.next")}: {nextName}
              </Text>
            ) : null}

            <View style={{ flex: 1 }} />

            {/* Actions */}
            <View style={{ gap: space[3], paddingBottom: space[5] }}>
              {mode === "rest" ? (
                <Button label={t("workouts.skipSet")} variant="secondary" onPress={() => goToStep(index + 1)} />
              ) : (
                <>
                  <Button
                    label={`✓  ${t("workouts.markAsDone")}`}
                    onPress={completeActive}
                    loading={logMutation.isPending}
                  />
                  <Button
                    label={t("workouts.skipSet")}
                    variant="secondary"
                    onPress={skipActive}
                    disabled={logMutation.isPending}
                  />
                </>
              )}
            </View>
          </View>
        </>
      )}

      {/* Pause overlay */}
      {paused ? (
        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            alignItems: "center",
            justifyContent: "center",
            gap: space[4],
            paddingHorizontal: space[5],
          }}
        >
          <Text style={typography.h1}>{t("workouts.paused")}</Text>
          <Text style={typography.labelCaps}>{fmt(elapsed)}</Text>
          <View style={{ flexDirection: "row", gap: space[3], marginTop: space[3] }}>
            <Pressable
              onPress={() => setPaused(false)}
              accessibilityRole="button"
              style={{
                width: 64,
                height: 64,
                borderRadius: radii.pill,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Play size={26} color={colors.canvas} fill={colors.canvas} />
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={{
                width: 64,
                height: 64,
                borderRadius: radii.pill,
                borderWidth: 1.5,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={26} color={colors.textHi} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: space[6], marginTop: space[2] }}>
            <Text style={typography.labelCaps}>{t("workouts.resume")}</Text>
            <Text style={typography.labelCaps}>{t("workouts.end")}</Text>
          </View>
        </View>
      ) : null}

      <NumberPad
        visible={pad === "reps"}
        title={t("workouts.repsPerSet")}
        initial={reps}
        onConfirm={(v) => {
          setReps(v);
          setPad(null);
        }}
        onCancel={() => setPad(null)}
      />
      <NumberPad
        visible={pad === "weight"}
        title={t("workouts.weight")}
        initial={weight}
        unit="kg"
        onConfirm={(v) => {
          setWeight(v);
          setPad(null);
        }}
        onCancel={() => setPad(null)}
      />
      <WorkoutSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
  );
}

function cap(s: ProgramSection): "Warmup" | "Main" | "Cooldown" {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as "Warmup" | "Main" | "Cooldown";
}
