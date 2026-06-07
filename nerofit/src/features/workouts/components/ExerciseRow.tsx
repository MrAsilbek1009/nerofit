import { Image, Pressable, Text, View } from "react-native";
import { Check, Play } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";
import type { WorkoutExerciseDetail } from "@/lib/api/workouts";
import { colors, fonts, radii, space, typography } from "@/theme";

export type ExerciseRowStatus = "done" | "current" | "skipped" | "pending";

export type ExerciseRowProps = {
  detail: WorkoutExerciseDetail;
  status: ExerciseRowStatus;
  onOpen: () => void;
  onMarkDone?: () => void;
  marking?: boolean;
};

function formatSub(detail: WorkoutExerciseDetail): string {
  const base = `${detail.sets} × ${detail.reps}`;
  return detail.load_note ? `${base} · ${detail.load_note}` : base;
}

function Thumb({
  uri,
  showPlay,
  dim,
}: {
  uri: string | null;
  showPlay?: boolean;
  dim?: boolean;
}) {
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: radii.sm,
        overflow: "hidden",
        backgroundColor: colors.elevated,
        opacity: dim ? 0.5 : 1,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} />
      ) : null}
      {showPlay ? (
        <View
          style={{
            position: "absolute",
            inset: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
        >
          <Play size={16} color={colors.textHi} fill={colors.textHi} />
        </View>
      ) : null}
    </View>
  );
}

function StatusCircle({ done }: { done: boolean }) {
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: done ? 0 : 1.5,
        borderColor: colors.border,
        backgroundColor: done ? colors.accent : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {done ? <Check size={15} color={colors.canvas} /> : null}
    </View>
  );
}

export function ExerciseRow({
  detail,
  status,
  onOpen,
  onMarkDone,
  marking,
}: ExerciseRowProps) {
  const { t } = useTranslation();
  const sub = formatSub(detail);
  const imageUri = detail.exercise.image_url;

  if (status === "current") {
    return (
      <View
        style={{
          backgroundColor: colors.elevated,
          borderRadius: radii.md,
          padding: space[4],
          gap: space[4],
        }}
      >
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}
        >
          <Thumb uri={imageUri} showPlay />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[typography.labelCaps, { color: colors.accent }]}>
              {t("workouts.currentExercise")}
            </Text>
            <Text
              style={{
                fontFamily: fonts.display,
                color: colors.textHi,
                fontSize: 18,
              }}
            >
              {detail.exercise.title}
            </Text>
            <Text
              style={{
                fontFamily: fonts.bodyMed,
                color: colors.accent,
                fontSize: 12,
              }}
            >
              {sub}
            </Text>
          </View>
          <StatusCircle done={false} />
        </Pressable>
        <Button
          label={t("workouts.markSetDone")}
          onPress={onMarkDone}
          loading={marking}
        />
      </View>
    );
  }

  const isDone = status === "done";
  const isSkipped = status === "skipped";

  return (
    <Pressable
      onPress={status === "pending" ? onOpen : undefined}
      accessibilityRole={status === "pending" ? "button" : undefined}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        paddingVertical: space[2],
      }}
    >
      <Thumb uri={imageUri} showPlay={status === "pending"} dim={isSkipped} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontFamily: fonts.bodyMed,
            fontSize: 16,
            color: isDone || isSkipped ? colors.textLo : colors.textHi,
            textDecorationLine: isDone ? "line-through" : "none",
            fontStyle: isSkipped ? "italic" : "normal",
          }}
        >
          {detail.exercise.title}
        </Text>
        {isSkipped ? (
          <Text style={typography.labelCaps}>{t("workouts.skipped")}</Text>
        ) : (
          <Text style={[typography.labelCaps, { letterSpacing: 0.8 }]}>{sub}</Text>
        )}
      </View>
      <StatusCircle done={isDone} />
    </Pressable>
  );
}
