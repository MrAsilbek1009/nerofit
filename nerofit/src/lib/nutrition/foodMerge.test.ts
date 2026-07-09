import { describe, expect, it } from "@jest/globals";
import { mergeFoodHits } from "./foodMerge";
import type { FoodSearchHit } from "./offParse";

function hit(name: string, opts: Partial<FoodSearchHit> = {}): FoodSearchHit {
  return {
    code: opts.code ?? name,
    name,
    brand: opts.brand ?? "",
    portion: "1 serving",
    kcal: 100,
    protein_g: 5,
    carbs_g: 10,
    fats_g: 2,
    confidence: "high",
    ...opts,
  };
}

describe("mergeFoodHits", () => {
  it("ranks local hits ahead of OFF hits", () => {
    const out = mergeFoodHits(
      [hit("Palov", { origin: "local", verified: true })],
      [hit("Bread", { origin: "off" })],
    );
    expect(out.map((h) => h.name)).toEqual(["Palov", "Bread"]);
    expect(out[0]!.verified).toBe(true);
  });

  it("drops duplicates (same name+brand), keeping the local one", () => {
    const out = mergeFoodHits(
      [hit("Yogurt", { origin: "local", verified: true, brand: "Nestle" })],
      [hit("yogurt", { origin: "off", brand: "NESTLE" })],
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.origin).toBe("local");
  });

  it("keeps same-name different-brand as separate", () => {
    const out = mergeFoodHits(
      [],
      [hit("Milk", { brand: "A" }), hit("Milk", { brand: "B" })],
    );
    expect(out).toHaveLength(2);
  });

  it("caps at the limit", () => {
    const off = Array.from({ length: 30 }, (_, i) => hit(`Food ${i}`));
    expect(mergeFoodHits([], off, 20)).toHaveLength(20);
  });

  it("handles empty inputs", () => {
    expect(mergeFoodHits([], [])).toEqual([]);
  });
});
