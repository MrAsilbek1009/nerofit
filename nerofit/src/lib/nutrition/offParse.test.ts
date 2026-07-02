import { describe, expect, it } from "@jest/globals";
import {
  foodScanResultFromHit,
  mergeName,
  normalizeOffProduct,
  parseOffProduct,
  parseOffSearch,
} from "./offParse";

const perServing = {
  code: "737628064502",
  product_name: "Greek Yogurt",
  brands: "Chobani",
  serving_size: "150 g",
  serving_quantity: 150,
  nutriments: {
    "energy-kcal_serving": 120,
    proteins_serving: 15,
    carbohydrates_serving: 6.4,
    fat_serving: 0,
    "energy-kcal_100g": 80,
    proteins_100g: 10,
    carbohydrates_100g: 4.3,
    fat_100g: 0,
  },
};

const only100g = {
  code: "111",
  product_name: "Rolled Oats",
  brands: "",
  nutriments: {
    "energy-kcal_100g": 379,
    proteins_100g: 13.2,
    carbohydrates_100g: 67.7,
    fat_100g: 6.5,
  },
};

describe("normalizeOffProduct", () => {
  it("prefers per-serving values and marks high confidence", () => {
    const n = normalizeOffProduct(perServing)!;
    expect(n.macros).toEqual({ kcal: 120, protein_g: 15, carbs_g: 6, fats_g: 0 });
    expect(n.portion).toBe("150 g");
    expect(n.confidence).toBe("high");
  });

  it("falls back to per-100g with medium confidence and rounds", () => {
    const n = normalizeOffProduct(only100g)!;
    expect(n.macros).toEqual({ kcal: 379, protein_g: 13, carbs_g: 68, fats_g: 7 });
    expect(n.portion).toBe("100 g");
    expect(n.confidence).toBe("medium");
  });

  it("returns null when calories are missing", () => {
    expect(
      normalizeOffProduct({ product_name: "Water", nutriments: { proteins_100g: 0 } }),
    ).toBeNull();
  });

  it("returns null when there is no name or brand", () => {
    expect(
      normalizeOffProduct({ nutriments: { "energy-kcal_100g": 10 } }),
    ).toBeNull();
  });
});

describe("mergeName", () => {
  it("joins name and brand", () => {
    expect(mergeName("Greek Yogurt", "Chobani")).toBe("Greek Yogurt · Chobani");
  });
  it("skips the brand when the name already contains it", () => {
    expect(mergeName("Chobani Yogurt", "Chobani")).toBe("Chobani Yogurt");
  });
  it("uses whichever side is present", () => {
    expect(mergeName("", "Chobani")).toBe("Chobani");
    expect(mergeName("Oats", "")).toBe("Oats");
  });
});

describe("parseOffProduct", () => {
  it("builds a single-item FoodScanResult with merged name", () => {
    const r = parseOffProduct(perServing)!;
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.name).toBe("Greek Yogurt · Chobani");
    expect(r.total).toEqual({ kcal: 120, protein_g: 15, carbs_g: 6, fats_g: 0 });
    expect(r.confidence).toBe("high");
  });

  it("returns null for unusable products", () => {
    expect(parseOffProduct({})).toBeNull();
    expect(parseOffProduct(null)).toBeNull();
  });
});

describe("parseOffSearch", () => {
  it("keeps usable products and drops incomplete ones", () => {
    const hits = parseOffSearch({
      products: [
        perServing,
        { product_name: "No Cals", nutriments: {} }, // dropped
        only100g,
      ],
    });
    expect(hits.map((h) => h.name)).toEqual(["Greek Yogurt", "Rolled Oats"]);
    expect(hits[0]!.brand).toBe("Chobani");
    expect(hits[0]!.kcal).toBe(120);
  });

  it("respects the limit and tolerates a non-array payload", () => {
    expect(parseOffSearch({ products: [perServing, only100g] }, 1)).toHaveLength(1);
    expect(parseOffSearch({})).toEqual([]);
    expect(parseOffSearch(null)).toEqual([]);
  });
});

describe("foodScanResultFromHit", () => {
  it("round-trips a search hit into an editable result", () => {
    const hit = parseOffSearch({ products: [perServing] })[0]!;
    const r = foodScanResultFromHit(hit);
    expect(r.items[0]!.name).toBe("Greek Yogurt · Chobani");
    expect(r.total).toEqual({ kcal: 120, protein_g: 15, carbs_g: 6, fats_g: 0 });
    expect(r.confidence).toBe("high");
  });
});
