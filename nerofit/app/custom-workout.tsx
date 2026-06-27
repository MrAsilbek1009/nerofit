import { useMemo } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, RefreshCw, SlidersHorizontal } from "lucide-react-native";
import { useUserId } from "@/hooks/useUser";
import { useGoals } from "@/lib/queries/goals";
import { useCreateCustomSession, useLibraryExercises } from "@/lib/queries/customWorkouts";
import { useGeneratorDraft } from "@/store/generatorDraft";
import { generateWorkout, type GeneratedExercise } from "@/features/workouts/generator";
import { exerciseImage } from "@/features/workouts/exerciseImages";
import type { ProgramSection } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

const SECTIONS: ProgramSection[] = ["warmup", "main", "cooldown"];

export default function CustomWorkoutScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useUserId();
  const params = useGeneratorDraft((s) => s.params);
  const seed = useGeneratorDraft((s) => s.seed);
  const reroll = useGeneratorDraft((s) => s.reroll);
  const goals = useGoals(userId);
  const library = useLibraryExercises();
  const create = useCreateCustomSession(userId);

  const generated = useMemo(() => {
    if (!library.data) return null;
    return generateWorkout(params, library.data, {
      injuries: goals.data?.injuries ?? [],
      goalsEquipment: goals.data?.equipment ?? undefined,
      seed,
    });
  }, [library.data, params, seed, goals.data]);

  const sectionLabels: Record<ProgramSection, string> = {
    warmup: t("workouts.sectionWarmup"),
    main: t("workouts.sectionMain"),
    cooldown: t("workouts.sectionCooldown"),
  };

  const meta = [
    `${params.timeMin} ${t("workouts.minShort")}`,
    t(`generator.targets.${params.target}`),
    t(`generator.focuses.${params.focus}`),
    t(`generator.difficulties.${params.difficulty}`),
    t(`generator.equipments.${params.equipment}`),
    params.warmup ? t("generator.withWarmup") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function start() {
    if (!generated || !userId || generated.exercises.length === 0) return;
    create.mutate(
      {
        title: generated.title,
        params: generated.params,
        exercises: generated.exercises.map((g) => ({
          exercise_id: g.exercise.id,
          section: g.section,
          order_index: g.order_index,
          reps: g.reps,
          sets: g.sets,
          rest_sec: g.rest_sec,
        })),
      },
      { onSuccess: (id) => router.replace(`/custom-workout-player/${id}`) },
    );
  }

  const loading = library.isLoading || goals.isLoading;
  const isEmpty = !!generated && generated.exercises.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top", "bottom"]}>
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
          {generated?.title ?? t("generator.customWorkout")}
        </Text>
        <Pressable onPress={() => router.replace("/workout-generator")} hitSlop={10} accessibilityRole="button">
          <SlidersHorizontal size={20} color={colors.textHi} />
        </Pressable>
      </View>

      {loading || !generated ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[5], gap: space[5] }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[typography.bodyMuted, { fontSize: 12 }]}>{meta}</Text>

            <Pressable
              onPress={reroll}
              accessibilityRole="button"
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: space[2],
                backgroundColor: colors.elevated,
                borderRadius: radii.pill,
                paddingHorizontal: space[4],
                paddingVertical: space[2],
              }}
            >
              <RefreshCw size={15} color={colors.textHi} />
              <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 13 }}>
                {t("generator.refresh")}
              </Text>
            </Pressable>

            {isEmpty ? (
              <View style={{ paddingTop: space[6], alignItems: "center" }}>
                <Text style={typography.bodyMuted}>{t("generator.empty")}</Text>
              </View>
            ) : (
              SECTIONS.map((section) => {
                const rows = generated.exercises.filter((e) => e.section === section);
                if (rows.length === 0) return null;
                return (
                  <View key={section} style={{ gap: space[3] }}>
                    <Text style={typography.labelCaps}>{sectionLabels[section]}</Text>
                    <View style={{ gap: space[2] }}>
                      {rows.map((g) => (
                        <ExerciseRow key={g.exercise.id + g.order_index} item={g} />
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={{ paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[5] }}>
            <Pressable
              onPress={start}
              disabled={isEmpty || create.isPending}
              accessibilityRole="button"
              style={{
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.accent,
                borderRadius: radii.pill,
                paddingVertical: space[4],
                opacity: isEmpty || create.isPending ? 0.5 : 1,
              }}
            >
              <Text style={{ fontFamily: fonts.label, color: colors.canvas, fontSize: 15 }}>
                {t("workouts.startWorkout")}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function ExerciseRow({ item }: { item: GeneratedExercise }) {
  const name = item.exercise.name_uz ?? item.exercise.title ?? "";
  const sub = item.sets && item.reps ? `${item.sets} × ${item.reps}` : (item.reps ?? "");
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        padding: space[3],
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: radii.sm, overflow: "hidden", backgroundColor: colors.surface }}>
        <Image source={{ uri: exerciseImage(item.exercise) }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15 }} numberOfLines={1}>
          {name}
        </Text>
        {sub ? <Text style={[typography.labelCaps, { fontSize: 9 }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}
