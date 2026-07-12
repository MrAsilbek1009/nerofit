import { describe, expect, it } from "@jest/globals";
import { recentFoodsFromLogs, sumMealItems } from "./fastLog";

type Log = {
  name: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
};

function log(overrides: Partial<Log>): Log {
  return {
    name: "Palov",
    kcal: 600,
    protein_g: 15,
    carbs_g: 65,
    fats_g: 30,
    ...overrides,
  };
}

describe("recentFoodsFromLogs", () => {
  it("keeps the most recent entry per name and drops later duplicates", () => {
    const res = recentFoodsFromLogs([
      log({ name: "Palov", kcal: 600 }),
      log({ name: "Somsa", kcal: 350 }),
      log({ name: "Palov", kcal: 550 }), // older duplicate — dropped
    ]);
    expect(res).toHaveLength(2);
    expect(res[0]).toEqual({
      name: "Palov",
      kcal: 600,
      protein_g: 15,
      carbs_g: 65,
      fats_g: 30,
    });
    expect(res[1]?.name).toBe("Somsa");
  });

  it("dedupes case- and whitespace-insensitively, keeping the trimmed name", () => {
    const res = recentFoodsFromLogs([
      log({ name: "  Palov " }),
      log({ name: "palov" }),
      log({ name: "PALOV" }),
    ]);
    expect(res).toHaveLength(1);
    expect(res[0]?.name).toBe("Palov");
  });

  it("skips rows with a missing/blank name or null/zero calories", () => {
    const res = recentFoodsFromLogs([
      log({ name: null }),
      log({ name: "   " }),
      log({ name: "No kcal", kcal: null }),
      log({ name: "Zero kcal", kcal: 0 }),
      log({ name: "Somsa" }),
    ]);
    expect(res).toHaveLength(1);
    expect(res[0]?.name).toBe("Somsa");
  });

  it("coerces null macros to 0", () => {
    const res = recentFoodsFromLogs([
      log({ protein_g: null, carbs_g: null, fats_g: null }),
    ]);
    expect(res[0]).toEqual({
      name: "Palov",
      kcal: 600,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
    });
  });

  it("respects the limit (counted after dedupe/skips)", () => {
    const logs = Array.from({ length: 6 }, (_, i) => log({ name: `Food ${i}` }));
    expect(recentFoodsFromLogs(logs, 3)).toHaveLength(3);
    expect(recentFoodsFromLogs(logs)).toHaveLength(6);
  });
});

describe("sumMealItems", () => {
  it("sums and rounds macro totals", () => {
    const total = sumMealItems([
      { kcal: 100.4, protein_g: 10.2, carbs_g: 20.3, fats_g: 5.4 },
      { kcal: 200.2, protein_g: 5.4, carbs_g: 10.1, fats_g: 2.2 },
    ]);
    expect(total).toEqual({ kcal: 301, protein_g: 16, carbs_g: 30, fats_g: 8 });
  });

  it("returns zeros for an empty array", () => {
    expect(sumMealItems([])).toEqual({
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
    });
  });
});
