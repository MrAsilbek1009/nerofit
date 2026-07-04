import { describe, expect, it } from "@jest/globals";
import type { FoodScanResult } from "@/lib/api/foodScan";
import { scanTitle } from "./scanUtils";

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
