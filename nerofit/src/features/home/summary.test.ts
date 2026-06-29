import { describe, expect, it } from "@jest/globals";
import type { MealLog } from "@/types/db";
import {
  computeHealthScore,
  consumedFraction,
  deriveCalorieGoal,
  estimateCaloriesBurned,
  healthBand,
  microIsGood,
  remaining,
  sumMealLogs,
  sumMicros,
} from "./summary";

// The functions only read macro/micro fields, so a partial row is enough.
function log(p: Partial<MealLog>): MealLog {
  return p as MealLog;
}

describe("sumMealLogs", () => {
  it("returns zeros for an empty list", () => {
    expect(sumMealLogs([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fats: 0 });
  });

  it("sums macros and treats nulls as zero", () => {
    const totals = sumMealLogs([
      log({ kcal: 500, protein_g: 30, carbs_g: 40, fats_g: 10 }),
      log({ kcal: 300, protein_g: 20, carbs_g: null, fats_g: null }),
    ]);
    expect(totals).toEqual({ kcal: 800, protein: 50, carbs: 40, fats: 10 });
  });
});

describe("deriveCalorieGoal", () => {
  it("applies Atwater factors (4/4/9)", () => {
    // 4*200 + 4*300 + 9*80 = 2720
    expect(
      deriveCalorieGoal({ protein_goal_g: 200, carbs_goal_g: 300, fats_goal_g: 80 }),
    ).toBe(2720);
  });
});

describe("remaining", () => {
  it("rounds and never goes negative", () => {
    expect(remaining(2720, 720)).toBe(2000);
    expect(remaining(100, 200)).toBe(0);
    expect(remaining(100.4, 0)).toBe(100);
  });
});

describe("consumedFraction", () => {
  it("clamps to 0..1 and guards divide-by-zero", () => {
    expect(consumedFraction(2000, 1000)).toBe(0.5);
    expect(consumedFraction(0, 100)).toBe(0);
    expect(consumedFraction(100, 200)).toBe(1);
    expect(consumedFraction(100, -50)).toBe(0);
  });
});

describe("sumMicros", () => {
  it("reports no data when every micro is null", () => {
    const m = sumMicros([log({ carbs_g: 40 })]);
    expect(m.hasData).toBe(false);
  });

  it("sums micros, flags data, and floors netCarbs at zero", () => {
    const m = sumMicros([
      log({ carbs_g: 40, fiber_g: 10, sugar_g: 12, sodium_mg: 500 }),
      log({ carbs_g: 5, fiber_g: 50, sugar_g: null, sodium_mg: null }),
    ]);
    expect(m.hasData).toBe(true);
    expect(m.fiber).toBe(60);
    expect(m.sugar).toBe(12);
    expect(m.sodium).toBe(500);
    // carbs(45) - fiber(60) → clamped to 0
    expect(m.netCarbs).toBe(0);
  });
});

describe("computeHealthScore", () => {
  it("is null without micro data", () => {
    expect(
      computeHealthScore({ fiber: 0, sugar: 0, sodium: 0, netCarbs: 0, hasData: false }),
    ).toBeNull();
  });

  it("is a perfect 10 when fiber is met and sugar/sodium stay under", () => {
    expect(
      computeHealthScore({ fiber: 28, sugar: 0, sodium: 0, netCarbs: 0, hasData: true }),
    ).toBe(10);
  });

  it("penalises missing fiber", () => {
    // fiberScore 0, sugar/sodium perfect → (0+1+1)/3*10 ≈ 7
    expect(
      computeHealthScore({ fiber: 0, sugar: 0, sodium: 0, netCarbs: 0, hasData: true }),
    ).toBe(7);
  });
});

describe("healthBand", () => {
  it("maps scores to bands", () => {
    expect(healthBand(10)).toBe("good");
    expect(healthBand(7)).toBe("good");
    expect(healthBand(6)).toBe("fair");
    expect(healthBand(4)).toBe("fair");
    expect(healthBand(3)).toBe("poor");
  });
});

describe("microIsGood", () => {
  it("fiber is a hit-at-least target", () => {
    expect(microIsGood("fiber", 28)).toBe(true);
    expect(microIsGood("fiber", 20)).toBe(false);
  });

  it("sugar and sodium are stay-under limits", () => {
    expect(microIsGood("sugar", 36)).toBe(true);
    expect(microIsGood("sugar", 40)).toBe(false);
    expect(microIsGood("sodium", 2300)).toBe(true);
    expect(microIsGood("sodium", 2500)).toBe(false);
  });
});

describe("estimateCaloriesBurned", () => {
  it("scales by body weight, defaulting to 70 kg", () => {
    expect(estimateCaloriesBurned(10000, 70)).toBe(400);
    expect(estimateCaloriesBurned(10000, null)).toBe(400);
    expect(estimateCaloriesBurned(5000, 140)).toBe(400);
    expect(estimateCaloriesBurned(0, 80)).toBe(0);
  });
});
