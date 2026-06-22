import { addBodyMetric } from "@/lib/api/bodyMetrics";
import { upsertGoals } from "@/lib/api/goals";
import { updateProfile } from "@/lib/api/profiles";
import type {
  BasicsValues,
  EquipmentValues,
  FocusValues,
} from "./schema";

export type FullDraft = BasicsValues & FocusValues & EquipmentValues;

export async function submitOnboarding(
  userId: string,
  draft: FullDraft,
): Promise<void> {
  // 1) Profile — sex / DOB / mark onboarded.
  await updateProfile(userId, {
    sex: draft.sex,
    date_of_birth: draft.date_of_birth,
    focus: draft.focus,
    onboarded_at: new Date().toISOString(),
  });

  // 2) Goals (upsert).
  await upsertGoals({
    user_id: userId,
    focus: draft.focus,
    activity_level: draft.activity_level,
    equipment: draft.equipment,
    injuries: draft.injuries ?? [],
    notes: draft.notes ?? null,
  });

  // 3) First body_metrics row.
  await addBodyMetric({
    user_id: userId,
    weight_kg: draft.weight_kg,
    height_cm: draft.height_cm,
  });
}
