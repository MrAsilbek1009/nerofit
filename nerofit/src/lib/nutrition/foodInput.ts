// Pure shape + validation for a user-submitted (crowdsourced) food. No I/O, so
// the validator is unit-testable without the RN/Supabase environment.

export type FoodInput = {
  name: string;
  brand: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  serving_label: string;
  serving_grams: number | null;
  barcode: string;
};

// Raw string values straight from the form's text inputs.
export type FoodInputRaw = {
  name: string;
  brand: string;
  kcal: string;
  protein_g: string;
  carbs_g: string;
  fats_g: string;
  serving_label: string;
  serving_grams: string;
  barcode: string;
};

export type FoodInputField = keyof FoodInputRaw;
export type FoodInputErrors = Partial<Record<FoodInputField, "required" | "invalid" | "tooLong">>;

// "" → null (empty), a valid non-negative number → the number, otherwise "invalid".
function parseNonNeg(s: string): number | null | "invalid" {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n;
}

const NUM_FIELDS = ["kcal", "protein_g", "carbs_g", "fats_g"] as const;

export function validateFoodInput(
  raw: FoodInputRaw,
): { ok: true; value: FoodInput } | { ok: false; errors: FoodInputErrors } {
  const errors: FoodInputErrors = {};

  const name = raw.name.trim();
  if (!name) errors.name = "required";
  else if (name.length > 80) errors.name = "tooLong";

  const nums: Record<(typeof NUM_FIELDS)[number], number> = {
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
  };
  for (const f of NUM_FIELDS) {
    const p = parseNonNeg(raw[f]);
    if (p === "invalid") errors[f] = "invalid";
    else nums[f] = p ?? 0;
  }
  // Calories are the one macro we insist on (macros may legitimately be 0).
  if (raw.kcal.trim() === "") errors.kcal = "required";

  let servingGrams: number | null = null;
  const g = parseNonNeg(raw.serving_grams);
  if (g === "invalid") errors.serving_grams = "invalid";
  else servingGrams = g;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      brand: raw.brand.trim(),
      kcal: nums.kcal,
      protein_g: nums.protein_g,
      carbs_g: nums.carbs_g,
      fats_g: nums.fats_g,
      serving_label: raw.serving_label.trim(),
      serving_grams: servingGrams,
      barcode: raw.barcode.trim(),
    },
  };
}
