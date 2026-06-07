import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { VideoCard } from "@/components/ui";
import type { ProgramWithWorkouts } from "@/lib/api/programs";

export function ProgramCard({ program }: { program: ProgramWithWorkouts }) {
  const router = useRouter();
  const { t } = useTranslation();
  const firstWorkout = program.workouts[0];

  const subtitle =
    firstWorkout && firstWorkout.est_minutes != null
      ? `${firstWorkout.est_minutes} ${t("workouts.minShort")} · ${
          firstWorkout.est_kcal ?? 0
        } ${t("workouts.kcalShort")}`
      : program.level.toUpperCase();

  return (
    <VideoCard
      title={program.title}
      subtitle={subtitle}
      imageUri={program.image_url ?? undefined}
      aspectRatio={16 / 11}
      onPress={() => {
        if (firstWorkout) router.push(`/workout/${firstWorkout.id}`);
      }}
    />
  );
}
