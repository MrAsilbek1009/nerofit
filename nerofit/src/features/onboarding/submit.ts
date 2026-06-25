import * as Localization from "expo-localization";
import { addBodyMetric } from "@/lib/api/bodyMetrics";
import { upsertGoals } from "@/lib/api/goals";
import { updateProfile } from "@/lib/api/profiles";
import { computeBmi, entryPointWeek, recommendFrequency } from "./routing";
import { ageFromDob } from "./schema";
import type {
  BasicsValues,
  EquipmentValues,
  ExperienceValues,
  FocusValues,
} from "./schema";

export type FullDraft = BasicsValues &
  FocusValues &
  ExperienceValues &
  EquipmentValues;

const IMPERIAL_REGIONS = ["US", "LR", "MM"];
function detectUnitSystem(): "metric" | "imperial" {
  const region = Localization.getLocales()[0]?.regionCode ?? null;
  return region && IMPERIAL_REGIONS.includes(region) ? "imperial" : "metric";
}

export async function submitOnboarding(
  userId: string,
  draft: FullDraft,
): Promise<void> {
  // Routing brain — BMI/age → frequency, experience → entry-point week.
  const age = ageFromDob(draft.date_of_birth);
  const bmi = computeBmi(draft.weight_kg, draft.height_cm);
  const trainingFrequency = recommendFrequency(bmi, age);
  const entryWeek = entryPointWeek(draft.experience_level);

  // 1) Profile — sex / DOB / unit system / mark onboarded.
  await updateProfile(userId, {
    sex: draft.sex,
    date_of_birth: draft.date_of_birth,
    focus: draft.focus,
    preferred_unit_system: detectUnitSystem(),
    onboarded_at: new Date().toISOString(),
  });

  // 2) Goals (upsert) + routing outputs.
  await upsertGoals({
    user_id: userId,
    focus: draft.focus,
    activity_level: draft.activity_level,
    equipment: draft.equipment,
    injuries: draft.injuries ?? [],
    notes: draft.notes ?? null,
    experience_level: draft.experience_level,
    entry_point_week: entryWeek,
    training_frequency: trainingFrequency,
  });

  // 3) First body_metrics row.
  await addBodyMetric({
    user_id: userId,
    weight_kg: draft.weight_kg,
    height_cm: draft.height_cm,
  });
}
