import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, MoreHorizontal, X } from "lucide-react-native";
import type { ProgramSection } from "@/types/db";
import { parseReps } from "../repsParse";
import { exerciseImage } from "../exerciseImages";
import { colors, fonts, radii, space, typography } from "@/theme";

// Minimal shape shared by curriculum (program_day_exercises) and custom
// (custom_session_exercises) so this list works for both players.
export type ListStep = {
  id: string;
  section: ProgramSection;
  reps: string | null;
  exercise: {
    name_uz?: string | null;
    title?: string | null;
    image_url?: string | null;
    category?: string | null;
  } | null;
};

export type SessionExerciseListProps = {
  visible: boolean;
  title: string;
  steps: ListStep[];
  currentIndex: number;
  onClose: () => void;
  onJump?: (index: number) => void;
};

const SECTION_ORDER: ProgramSection[] = ["warmup", "main", "cooldown"];

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Full-screen session overview reached from the player's list icon: every
// exercise grouped by section with thumbnail, status and the current row
// expanded to show its Time / Reps / Weight (matching the design).
export function SessionExerciseList({
  visible,
  title,
  steps,
  currentIndex,
  onClose,
  onJump,
}: SessionExerciseListProps) {
  const { t } = useTranslation();
  const labels: Record<ProgramSection, string> = {
    warmup: t("workouts.sectionWarmup"),
    main: t("workouts.sectionMain"),
    cooldown: t("workouts.sectionCooldown"),
  };
  const indexed = steps.map((step, index) => ({ step, index }));

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        {/* Grabber + title */}
        <View style={{ alignItems: "center", paddingTop: space[3] }}>
          <View style={{ width: 36, height: 4, borderRadius: radii.pill, backgroundColor: colors.border }} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: space[5],
            paddingVertical: space[3],
          }}
        >
          <Text style={[typography.h2, { textAlign: "center" }]} numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.close")}
            style={{ position: "absolute", right: space[5] }}
          >
            <X size={24} color={colors.textHi} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[7], gap: space[5] }}
          showsVerticalScrollIndicator={false}
        >
          {SECTION_ORDER.map((section) => {
            const rows = indexed.filter((r) => r.step.section === section);
            if (rows.length === 0) return null;
            return (
              <View key={section} style={{ gap: space[3] }}>
                <Text style={typography.labelCaps}>{labels[section]}</Text>
                <View style={{ gap: space[3] }}>
                  {rows.map(({ step, index }) => (
                    <Row
                      key={step.id}
                      step={step}
                      done={index < currentIndex}
                      current={index === currentIndex}
                      onPress={onJump ? () => { onJump(index); onClose(); } : undefined}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Row({
  step,
  done,
  current,
  onPress,
}: {
  step: ListStep;
  done: boolean;
  current: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const name = step.exercise?.name_uz ?? step.exercise?.title ?? "";
  const target = parseReps(step.reps);
  const img = exerciseImage(step.exercise);

  return (
    <View style={{ backgroundColor: colors.elevated, borderRadius: radii.md, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        style={{ flexDirection: "row", alignItems: "center", gap: space[3], padding: space[3] }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.sm,
            overflow: "hidden",
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontFamily: fonts.bodyMed,
              fontSize: 15,
              color: current ? colors.accent : colors.textHi,
            }}
            numberOfLines={2}
          >
            {name}
          </Text>
          {done ? (
            <Check size={14} color={colors.accent} strokeWidth={2.5} />
          ) : (
            <View
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: current ? colors.accent : colors.textLo }}
            />
          )}
        </View>
        <MoreHorizontal size={20} color={colors.textLo} accessible={false} />
      </Pressable>

      {current ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space[2],
            paddingHorizontal: space[3],
            paddingBottom: space[3],
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={15} color={colors.canvas} />
          </View>
          <Cell label={t("workouts.time")} value={target.kind === "time" ? fmt(target.value ?? 0) : "—"} />
          <Cell label={t("workouts.reps")} value={target.kind === "reps" ? String(target.value ?? 0) : "0"} />
          <Cell label={t("workouts.weight")} value="—" />
        </View>
      ) : null}
    </View>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={[typography.labelCaps, { fontSize: 8 }]}>{label}</Text>
      <View
        style={{
          alignSelf: "stretch",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: radii.sm,
          paddingVertical: space[2],
        }}
      >
        <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 15 }}>{value}</Text>
      </View>
    </View>
  );
}
