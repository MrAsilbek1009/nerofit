import { describe, expect, it } from "@jest/globals";
import { validateFoodInput, type FoodInputRaw } from "./foodInput";

const base: FoodInputRaw = {
  name: "Palov",
  brand: "",
  kcal: "600",
  protein_g: "15",
  carbs_g: "65",
  fats_g: "30",
  serving_label: "1 plate",
  serving_grams: "300",
  barcode: "",
};

function raw(overrides: Partial<FoodInputRaw>): FoodInputRaw {
  return { ...base, ...overrides };
}

describe("validateFoodInput", () => {
  it("parses and trims a valid input", () => {
    const res = validateFoodInput(raw({ name: "  Palov  ", brand: " Uz " }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.name).toBe("Palov");
    expect(res.value.brand).toBe("Uz");
    expect(res.value.kcal).toBe(600);
    expect(res.value.serving_grams).toBe(300);
  });

  it("requires a name", () => {
    const res = validateFoodInput(raw({ name: "   " }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.name).toBe("required");
  });

  it("rejects an over-long name", () => {
    const res = validateFoodInput(raw({ name: "x".repeat(81) }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.name).toBe("tooLong");
  });

  it("requires calories", () => {
    const res = validateFoodInput(raw({ kcal: "" }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.kcal).toBe("required");
  });

  it("rejects non-numeric and negative numbers", () => {
    expect(validateFoodInput(raw({ kcal: "abc" })).ok).toBe(false);
    expect(validateFoodInput(raw({ protein_g: "-5" })).ok).toBe(false);
  });

  it("defaults empty macros to 0 and empty grams to null", () => {
    const res = validateFoodInput(
      raw({ protein_g: "", carbs_g: "", fats_g: "", serving_grams: "" }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.protein_g).toBe(0);
    expect(res.value.serving_grams).toBeNull();
  });
});
