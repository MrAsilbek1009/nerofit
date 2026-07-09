import type { FoodSearchHit } from "./offParse";

// Pure: local database hits (already verified-first from the query) rank ahead of
// OpenFoodFacts hits; duplicates (same name + brand, case-insensitive) are dropped
// keeping the earlier (local) one; result is capped. Unit-testable.
export function mergeFoodHits(
  local: FoodSearchHit[],
  off: FoodSearchHit[],
  limit = 20,
): FoodSearchHit[] {
  const seen = new Set<string>();
  const out: FoodSearchHit[] = [];
  for (const hit of [...local, ...off]) {
    const key = `${hit.name.trim().toLowerCase()}|${hit.brand.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}
