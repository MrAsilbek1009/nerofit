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

export const basicsSchema = z.object({
  sex: z.enum(SEX_VALUES),
  age: z.coerce.number().int().min(13).max(99),
  height_cm: z.coerce.number().min(120).max(230),
  weight_kg: z.coerce.number().min(30).max(250),
});
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
