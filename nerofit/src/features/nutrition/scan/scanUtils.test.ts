import { describe, expect, it } from "@jest/globals";
import type { FoodScanResult } from "@/lib/api/foodScan";
import { amountFactor, gramRange, scanTitle } from "./scanUtils";

function result(names: string[]): FoodScanResult {
  return {
    items: names.map((name) => ({
      name,
      portion: "",
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
    })),
    total: { kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
    confidence: "low",
    notes: "",
  };
}

describe("scanTitle", () => {
  it("uses the first detected item's name", () => {
    expect(scanTitle(result(["Greek Yogurt", "Honey"]), "Fallback")).toBe("Greek Yogurt");
  });

  it("trims surrounding whitespace", () => {
    expect(scanTitle(result(["  Oats  "]), "Fallback")).toBe("Oats");
  });

  it("falls back when there are no items", () => {
    expect(scanTitle(result([]), "Scanned meal")).toBe("Scanned meal");
  });

  it("falls back when the first name is blank", () => {
    expect(scanTitle(result(["   "]), "Scanned meal")).toBe("Scanned meal");
  });
});

describe("amountFactor", () => {
  it("scales by servings in serving mode", () => {
    expect(amountFactor("serving", 2, 999, 300)).toBe(2);
  });

  it("scales grams against the estimated weight in gram mode", () => {
    expect(amountFactor("gram", 1, 150, 300)).toBe(0.5);
    expect(amountFactor("gram", 1, 600, 300)).toBe(2);
  });

  it("guards gram mode against a missing/zero weight", () => {
    expect(amountFactor("gram", 1, 150, null)).toBe(1);
    expect(amountFactor("gram", 1, 150, 0)).toBe(1);
  });
});

describe("gramRange", () => {
  it("spans one step to ~3x the estimate in 5g steps", () => {
    expect(gramRange(300)).toEqual({ min: 5, max: 900, step: 5 });
  });

  it("rounds the max up to a step boundary", () => {
    expect(gramRange(101)).toEqual({ min: 5, max: 305, step: 5 });
  });

  it("keeps a usable range for tiny estimates", () => {
    expect(gramRange(2)).toEqual({ min: 5, max: 10, step: 5 });
  });
});
