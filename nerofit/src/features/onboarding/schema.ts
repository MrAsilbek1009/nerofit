import { z } from "zod";

export const SEX_VALUES = ["male", "female", "non_binary"] as const;
export const FOCUS_VALUES = ["lose_fat", "build_muscle", "stay_fit"] as const;
export const ACTIVITY_VALUES = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
] as const;
export const EQUIPMENT_VALUES = ["no_equipment", "home_gym", "full_gym"] as const;
export const INJURY_VALUES = [
  "lower_back",
  "knees",
  "shoulders",
  "wrists",
  "ankles",
] as const;

// Whole-year age from an ISO (YYYY-MM-DD) birth date.
export function ageFromDob(iso: string): number {
  const dob = new Date(`${iso}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

// Step 1 — biological sex (its own onboarding screen).
export const sexSchema = z.object({
  sex: z.enum(SEX_VALUES),
});
export type SexValues = z.infer<typeof sexSchema>;

// Step 2 — date of birth + body metrics.
export const bodySchema = z.object({
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => {
      const age = ageFromDob(s);
      return age >= 13 && age <= 99;
    }, { message: "Age must be between 13 and 99." }),
  height_cm: z.coerce.number().min(120).max(230),
  weight_kg: z.coerce.number().min(30).max(250),
});
export type BodyValues = z.infer<typeof bodySchema>;

// Combined view (used when persisting the finished draft).
export const basicsSchema = sexSchema.merge(bodySchema);
export type BasicsValues = z.infer<typeof basicsSchema>;

export const focusSchema = z.object({
  focus: z.enum(FOCUS_VALUES),
  activity_level: z.enum(ACTIVITY_VALUES),
});
export type FocusValues = z.infer<typeof focusSchema>;

export const equipmentSchema = z.object({
  equipment: z.enum(EQUIPMENT_VALUES),
  injuries: z.array(z.enum(INJURY_VALUES)).default([]),
  notes: z.string().max(500).optional(),
});
export type EquipmentValues = z.infer<typeof equipmentSchema>;

export type OnboardingDraft = Partial<BasicsValues> &
  Partial<FocusValues> &
  Partial<EquipmentValues>;
