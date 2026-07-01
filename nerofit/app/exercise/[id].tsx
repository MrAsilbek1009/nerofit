import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useVideoPlayer, VideoView } from "expo-video";
import { Check, MoreVertical, Play, X } from "lucide-react-native";
import { Button, ProgressRing } from "@/components/ui";
import { useUserId } from "@/hooks/useUser";
import { useWorkoutDetail } from "@/lib/queries/workoutDetail";
import { useLogExercise } from "@/lib/queries/session";
import type { LogStatus } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ExercisePlayerScreen() {
  const params = useLocalSearchParams<{
    id: string;
    workoutId: string;
    sessionId: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();

  const detailQuery = useWorkoutDetail(params.workoutId);
  const logMutation = useLogExercise(userId, params.workoutId);

  const we = detailQuery.data?.workout_exercises.find((x) => x.id === params.id);
  const videoUri = we?.exercise.exercise_videos[0]?.url ?? null;
  const totalSets = we?.sets ?? 1;
  const restSec = we?.rest_sec ?? 45;

  const [currentSet, setCurrentSet] = useState(1);
  const [completedSets, setCompletedSets] = useState(0);
  const [resting, setResting] = useState(false);
  const [restRemaining, setRestRemaining] = useState(restSec);
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Rest countdown.
  useEffect(() => {
    if (!resting) return;
    const iv = setInterval(() => {
      setRestRemaining((r) => {
        if (r <= 1) {
          setResting(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [resting]);

  function togglePlay() {
    if (!videoUri) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }

  function finalize(completed: number) {
    if (!we) return;
    const status: LogStatus = completed > 0 ? "done" : "skipped";
    logMutation.mutate(
      {
        sessionId: params.sessionId,
        exerciseId: we.exercise_id,
        status,
        setsDone: completed,
        repsDone: null,
      },
      { onSuccess: () => router.back() },
    );
  }

  function advance(didComplete: boolean) {
    const newCompleted = completedSets + (didComplete ? 1 : 0);
    if (currentSet >= totalSets) {
      finalize(newCompleted);
      return;
    }
    setCompletedSets(newCompleted);
    setCurrentSet((s) => s + 1);
    if (didComplete) {
      setRestRemaining(restSec);
      setResting(true);
    }
  }

  if (detailQuery.isLoading || !we) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const ringProgress = resting ? restRemaining / restSec : 1;
  const ringText = formatTime(resting ? restRemaining : restSec);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top", "bottom"]}>
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
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("a11y.close")}>
          <X size={24} color={colors.textHi} />
        </Pressable>
        <Text style={typography.labelCaps}>{t("workouts.inProgress")}</Text>
        <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel={t("a11y.workoutOptions")}>
          <MoreVertical size={22} color={colors.textHi} />
        </Pressable>
      </View>

      {/* Video / image hero */}
      <Pressable
        onPress={togglePlay}
        style={{ height: 240, backgroundColor: colors.elevated }}
      >
        {videoUri ? (
          <VideoView
            player={player}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            nativeControls={false}
          />
        ) : we.exercise.image_url ? (
          <Image
            source={{ uri: we.exercise.image_url }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : null}
        {!isPlaying ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radii.pill,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Play size={24} color={colors.canvas} fill={colors.canvas} />
            </View>
          </View>
        ) : null}
      </Pressable>

      {/* Content */}
      <View style={{ flex: 1, paddingHorizontal: space[5], paddingTop: space[5], gap: space[5] }}>
        <View style={{ gap: space[2] }}>
          <Text
            style={[typography.display, { fontSize: 32, lineHeight: 34, textTransform: "uppercase" }]}
          >
            {we.exercise.title}
          </Text>
          <Text style={typography.labelCaps}>
            {we.exercise.target_muscles.join(", ")}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Reps */}
          <View style={{ gap: space[1] }}>
            <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 64, lineHeight: 64 }}>
              {we.reps}
            </Text>
            <Text style={[typography.labelCaps, { color: colors.accent }]}>
              {t("workouts.reps")}
            </Text>
            <Text style={typography.labelCaps}>
              {t("workouts.setOf", { current: currentSet, total: totalSets })}
            </Text>
          </View>

          {/* Rest ring */}
          <View style={{ width: 110, height: 110, alignItems: "center", justifyContent: "center" }}>
            <ProgressRing progress={ringProgress} size={110} strokeWidth={4} />
            <View style={{ position: "absolute", alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 22 }}>
                {ringText}
              </Text>
              <Text style={[typography.labelCaps, { fontSize: 9 }]}>
                {t("workouts.rest")}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Actions */}
        <View style={{ gap: space[3], paddingBottom: space[5] }}>
          <Button
            label={`✓  ${t("workouts.markAsDone")}`}
            onPress={() => advance(true)}
            loading={logMutation.isPending}
          />
          <Button
            label={t("workouts.skipSet")}
            variant="secondary"
            onPress={() => advance(false)}
            disabled={logMutation.isPending}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
