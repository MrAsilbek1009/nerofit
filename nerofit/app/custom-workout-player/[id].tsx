import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  Check,
  ClipboardList,
  MoreHorizontal,
  Pause,
  Play,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { ProgressRing } from "@/components/ui";
import { NumberPad } from "@/features/workouts/components/NumberPad";
import { StepperBox } from "@/features/workouts/components/StepperBox";
import { SessionExerciseList } from "@/features/workouts/components/SessionExerciseList";
import { WorkoutSettingsSheet } from "@/features/workouts/components/WorkoutSettingsSheet";
import { parseReps } from "@/features/workouts/repsParse";
import { exerciseImage } from "@/features/workouts/exerciseImages";
import { useUserId } from "@/hooks/useUser";
import {
  useCompleteCustomSession,
  useCustomSession,
  useLogCustomExercise,
} from "@/lib/queries/customWorkouts";
import type { CustomExerciseWithExercise } from "@/lib/api/customWorkouts";
import type { ProgramSection } from "@/types/db";
import { useWorkoutSettings } from "@/store/workoutSettings";
import { colors, fonts, radii, space, typography } from "@/theme";

const RING = Math.min(Dimensions.get("window").width * 0.34, 140);

type Mode = "ready" | "active" | "rest";

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CustomWorkoutPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();

  const detail = useCustomSession(id);
  const logMutation = useLogCustomExercise(id);
  const completeMutation = useCompleteCustomSession(userId);

  const steps = useMemo<CustomExerciseWithExercise[]>(
    () => detail.data?.custom_session_exercises ?? [],
    [detail.data],
  );

  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("ready");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [workUp, setWorkUp] = useState(0);
  const [reps, setReps] = useState(0);
  const [weight, setWeight] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [pad, setPad] = useState<null | "reps" | "weight">(null);

  const autoPilot = useWorkoutSettings((s) => s.autoPilot);

  const current = steps[index];
  const target = useMemo(() => parseReps(current?.reps), [current]);
  const isTimed = target.kind === "time";
  const perSide = /har\s/i.test(current?.reps ?? "");
  const restBase = current?.rest_sec ?? 0;

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
    setIndex(i);
    setReps(0);
    setWeight(0);
    setWorkUp(0);
    const tgt = parseReps(next.reps);
    if (useWorkoutSettings.getState().exerciseIntro) {
      setMode("ready");
    } else {
      setMode("active");
      setSecondsLeft(tgt.kind === "time" ? (tgt.value ?? 0) : 0);
    }
  }

  function begin() {
    setWorkUp(0);
    setMode("active");
    setSecondsLeft(isTimed ? (target.value ?? 0) : 0);
  }

  function finish() {
    if (id) completeMutation.mutate(id);
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
    if (!current) return;
    logMutation.mutate({
      id: current.id,
      status,
      setsDone: current.sets ?? 1,
      repsDone: status === "done" && reps > 0 ? reps : null,
      weightUsed: status === "done" && weight > 0 ? weight : null,
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

  function onCenterPress() {
    if (mode === "rest") goToStep(index + 1);
    else completeActive();
  }

  useEffect(() => {
    if (paused) return;
    const counting = mode === "rest" || (mode === "active" && isTimed);
    if (!counting) return;
    const iv = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(iv);
  }, [paused, mode, isTimed]);

  useEffect(() => {
    if (paused || mode !== "active" || isTimed) return;
    const iv = setInterval(() => setWorkUp((w) => w + 1), 1000);
    return () => clearInterval(iv);
  }, [paused, mode, isTimed]);

  useEffect(() => {
    if (secondsLeft !== 0) return;
    if (mode === "rest") goToStep(index + 1);
    else if (mode === "active" && isTimed && autoPilot) completeActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, mode, autoPilot]);

  useEffect(() => {
    if (paused || finished) return;
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(iv);
  }, [paused, finished]);

  const videoUri = current?.exercise?.exercise_videos?.[0]?.url ?? null;
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    player.replace(videoUri);
    if (videoUri && mode === "active" && !paused) player.play();
  }, [videoUri, player, mode, paused]);

  if (detail.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (finished || steps.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space[5], gap: space[5] }}>
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
          <Text style={[typography.display, { fontSize: 44, lineHeight: 46, textTransform: "uppercase", textAlign: "center" }]}>
            {t("workouts.wayToGo")}
          </Text>
          <View style={{ flexDirection: "row", gap: space[6] }}>
            <Stat label={t("workouts.duration")} value={fmt(elapsed)} />
            <Stat label={t("workouts.exercisesLabel")} value={`${steps.length}/${steps.length}`} />
          </View>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            style={{
              alignSelf: "stretch",
              alignItems: "center",
              backgroundColor: colors.accent,
              borderRadius: radii.pill,
              paddingVertical: space[4],
            }}
          >
            <Text style={{ fontFamily: fonts.label, color: colors.canvas, fontSize: 15 }}>{t("workouts.completeWorkout")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const exerciseName = current?.exercise?.name_uz ?? current?.exercise?.title ?? "";
  const nextStep = steps[index + 1];
  const nextName = nextStep?.exercise?.name_uz ?? nextStep?.exercise?.title ?? null;
  const ringTime = mode === "rest" ? secondsLeft : isTimed ? secondsLeft : workUp;
  const ringProgress = mode === "rest" ? secondsLeft / (restBase || 1) : isTimed ? secondsLeft / (target.value || 1) : 1;

  function MediaFill() {
    if (videoUri) {
      return <VideoView player={player} style={{ width: "100%", height: "100%" }} contentFit="cover" nativeControls={false} />;
    }
    return <Image source={{ uri: exerciseImage(current?.exercise) }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top", "bottom"]}>
      <View style={{ paddingHorizontal: space[5], paddingVertical: space[3], gap: space[3] }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
            <CircleBtn onPress={() => setPaused(true)}>
              <Pause size={16} color={colors.textHi} fill={colors.textHi} />
            </CircleBtn>
            <Text style={typography.labelCaps}>{fmt(elapsed)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space[4] }}>
            <Pressable onPress={() => setSettingsOpen(true)} hitSlop={10} accessibilityRole="button">
              <SlidersHorizontal size={20} color={colors.textHi} />
            </Pressable>
            <Pressable onPress={() => setListOpen(true)} hitSlop={10} accessibilityRole="button">
              <ClipboardList size={22} color={colors.accent} />
            </Pressable>
          </View>
        </View>
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
        <Pressable onPress={begin} style={{ flex: 1 }}>
          <View style={[StyleAbsoluteFill, { opacity: 0.25 }]}>{MediaFill()}</View>
          <View style={{ flex: 1, paddingHorizontal: space[5], justifyContent: "center", gap: space[2] }}>
            <Text style={[typography.labelCaps, { color: colors.accent }]}>{t(`workouts.section${cap(current!.section)}`)}</Text>
            <Text style={typography.bodyMuted}>{t("workouts.getReadyFor")}</Text>
            <Text style={[typography.display, { fontSize: 40, lineHeight: 42, textTransform: "uppercase" }]}>{exerciseName}</Text>
            <Text style={[typography.labelCaps, { marginTop: space[1] }]}>{target.raw}</Text>
          </View>
          <View style={{ position: "absolute", bottom: space[6], left: 0, right: 0, alignItems: "center" }}>
            <Text style={typography.labelCaps}>{t("workouts.swipeToBegin")}</Text>
          </View>
        </Pressable>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: space[5], paddingBottom: space[4], gap: space[3] }}>
          <View style={{ flex: 1, borderRadius: radii.md, overflow: "hidden", backgroundColor: colors.elevated }}>
            <View style={StyleAbsoluteFill}>{MediaFill()}</View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: space[3],
                paddingHorizontal: space[4],
                paddingTop: space[4],
                paddingBottom: space[6],
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.labelCaps, { color: colors.accent }]}>
                  {t("workouts.setOf", { current: index + 1, total: steps.length })}
                </Text>
                <Text style={[typography.display, { fontSize: 24, lineHeight: 26 }]} numberOfLines={2}>
                  {exerciseName}
                </Text>
              </View>
              <Pressable onPress={() => setSettingsOpen(true)} hitSlop={10} accessibilityRole="button">
                <MoreHorizontal size={22} color={colors.textHi} />
              </Pressable>
            </View>

            <View style={{ flex: 1 }} />

            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                paddingHorizontal: space[4],
                paddingTop: space[6],
                paddingBottom: space[4],
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
            >
              {mode === "active" ? (
                <StepperBox label={t("workouts.reps")} value={reps} onPress={() => setPad("reps")} />
              ) : (
                <View style={{ width: 44 }} />
              )}

              <Pressable onPress={onCenterPress} accessibilityRole="button" style={{ alignItems: "center" }}>
                <View style={{ width: RING, height: RING, alignItems: "center", justifyContent: "center" }}>
                  <ProgressRing progress={ringProgress} size={RING} strokeWidth={5} />
                  <View style={{ position: "absolute", alignItems: "center" }}>
                    <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 30 }}>{fmt(ringTime)}</Text>
                    <Text style={[typography.labelCaps, { fontSize: 8 }]}>
                      {mode === "rest" ? t("workouts.rest") : t(`workouts.section${cap(current!.section)}`)}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {mode === "active" ? (
                <StepperBox label={t("workouts.weight")} value={weight} onPress={() => setPad("weight")} />
              ) : (
                <View style={{ width: 44 }} />
              )}
            </View>
          </View>

          <View style={{ gap: space[2], alignItems: "center" }}>
            {nextName ? (
              <Text style={[typography.labelCaps, { textAlign: "center" }]} numberOfLines={1}>
                {t("workouts.next")} → {nextName}
              </Text>
            ) : null}
            <Pressable onPress={() => (mode === "rest" ? goToStep(index + 1) : skipActive())} hitSlop={8} accessibilityRole="button">
              <Text style={[typography.labelCaps, { color: colors.textLo }]}>{t("workouts.skipSet")}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {paused ? (
        <View
          style={[
            StyleAbsoluteFill,
            { backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", gap: space[4], paddingHorizontal: space[5] },
          ]}
        >
          <Text style={typography.h1}>{t("workouts.paused")}</Text>
          <Text style={typography.labelCaps}>{fmt(elapsed)}</Text>
          <View style={{ flexDirection: "row", gap: space[6], marginTop: space[3] }}>
            <View style={{ alignItems: "center", gap: space[2] }}>
              <Pressable
                onPress={() => setPaused(false)}
                accessibilityRole="button"
                style={{ width: 64, height: 64, borderRadius: radii.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}
              >
                <Play size={26} color={colors.canvas} fill={colors.canvas} />
              </Pressable>
              <Text style={typography.labelCaps}>{t("workouts.resume")}</Text>
            </View>
            <View style={{ alignItems: "center", gap: space[2] }}>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                style={{ width: 64, height: 64, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
              >
                <X size={26} color={colors.textHi} />
              </Pressable>
              <Text style={typography.labelCaps}>{t("workouts.end")}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <NumberPad
        visible={pad === "reps"}
        title={perSide ? t("workouts.repsPerSide") : t("workouts.repsPerSet")}
        onConfirm={(v) => {
          setReps(v);
          setPad(null);
        }}
        onCancel={() => setPad(null)}
      />
      <NumberPad
        visible={pad === "weight"}
        title={t("workouts.weight")}
        unit="kg"
        onConfirm={(v) => {
          setWeight(v);
          setPad(null);
        }}
        onCancel={() => setPad(null)}
      />
      <WorkoutSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SessionExerciseList
        visible={listOpen}
        title={detail.data?.title ?? ""}
        steps={steps}
        currentIndex={index}
        onClose={() => setListOpen(false)}
        onJump={(i) => enterStep(i)}
      />
    </SafeAreaView>
  );
}

const StyleAbsoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

function CircleBtn({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      style={{ width: 32, height: 32, borderRadius: radii.pill, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" }}
    >
      {children}
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 20 }}>{value}</Text>
      <Text style={[typography.labelCaps, { fontSize: 8 }]}>{label}</Text>
    </View>
  );
}

function cap(s: ProgramSection): "Warmup" | "Main" | "Cooldown" {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as "Warmup" | "Main" | "Cooldown";
}
