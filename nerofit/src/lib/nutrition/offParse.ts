import type {
  FoodScanConfidence,
  FoodScanMacros,
  FoodScanResult,
} from "@/lib/api/foodScan";

// Pure parsers for OpenFoodFacts (OFF) responses. No imports with runtime side
// effects (the `import type` above is erased), so this stays unit-testable
// without the RN/native environment.

// A single search result row — lighter than a full FoodScanResult, plus the
// brand kept separate for a two-line list item.
export type FoodSearchHit = FoodScanMacros & {
  code: string;
  name: string;
  brand: string;
  portion: string;
  confidence: FoodScanConfidence;
};

type OffNutriments = Record<string, unknown>;
type OffProduct = {
  code?: unknown;
  product_name?: unknown;
  brands?: unknown;
  serving_size?: unknown;
  serving_quantity?: unknown;
  nutriments?: unknown;
};

type NormalizedFood = {
  productName: string;
  brand: string;
  portion: string;
  confidence: FoodScanConfidence;
  macros: FoodScanMacros;
};

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function firstBrand(brands: string): string {
  return brands.split(",")[0]?.trim() ?? "";
}

// "Yogurt" + "Chobani" -> "Yogurt · Chobani" (skip when the name already carries
// the brand). Used as the editable default name in the result editor.
export function mergeName(productName: string, brand: string): string {
  if (productName && brand && !productName.toLowerCase().includes(brand.toLowerCase())) {
    return `${productName} · ${brand}`;
  }
  return productName || brand || "";
}

function servingLabel(product: OffProduct): string {
  const size = str(product.serving_size);
  if (size) return size;
  const qty = num(product.serving_quantity);
  return qty != null ? `${Math.round(qty)} g` : "1 serving";
}

// Normalise one OFF product into the fields we care about, or null when it lacks
// a name or calories (both required to be useful). Prefers per-serving values;
// falls back to per-100g (lower confidence).
export function normalizeOffProduct(product: unknown): NormalizedFood | null {
  if (!product || typeof product !== "object") return null;
  const p = product as OffProduct;
  const nutr: OffNutriments =
    p.nutriments && typeof p.nutriments === "object"
      ? (p.nutriments as OffNutriments)
      : {};

  const productName = str(p.product_name);
  const brand = firstBrand(str(p.brands));
  if (!productName && !brand) return null;

  const kcalServing = num(nutr["energy-kcal_serving"]);
  const kcal100 = num(nutr["energy-kcal_100g"]);
  const useServing = kcalServing != null;
  const kcal = useServing ? kcalServing : kcal100;
  if (kcal == null) return null; // no calories → drop

  const suffix = useServing ? "_serving" : "_100g";
  const macro = (base: string) => Math.round(num(nutr[`${base}${suffix}`]) ?? 0);

  return {
    productName,
    brand,
    portion: useServing ? servingLabel(p) : "100 g",
    confidence: useServing ? "high" : "medium",
    macros: {
      kcal: Math.round(kcal),
      protein_g: macro("proteins"),
      carbs_g: macro("carbohydrates"),
      fats_g: macro("fat"),
    },
  };
}

// A barcode lookup returns exactly one product → a full FoodScanResult so it can
// reuse the same result editor as the AI photo scan.
export function parseOffProduct(product: unknown): FoodScanResult | null {
  const n = normalizeOffProduct(product);
  if (!n) return null;
  return {
    items: [{ name: mergeName(n.productName, n.brand), portion: n.portion, ...n.macros }],
    total: n.macros,
    confidence: n.confidence,
    notes: "",
  };
}

// Search returns many products → lightweight hits for a list. Incomplete rows
// (no name/calories) are filtered out.
export function parseOffSearch(json: unknown, limit = 20): FoodSearchHit[] {
  const products =
    json && typeof json === "object" && Array.isArray((json as { products?: unknown }).products)
      ? (json as { products: unknown[] }).products
      : [];

  const hits: FoodSearchHit[] = [];
  for (const prod of products) {
    const n = normalizeOffProduct(prod);
    if (!n) continue;
    hits.push({
      code: str((prod as OffProduct).code),
      name: n.productName || n.brand,
      brand: n.brand,
      portion: n.portion,
      confidence: n.confidence,
      ...n.macros,
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

// Build a FoodScanResult when the user taps a search hit, so selection flows into
// the same editor as barcode/photo.
export function foodScanResultFromHit(hit: FoodSearchHit): FoodScanResult {
  const macros: FoodScanMacros = {
    kcal: hit.kcal,
    protein_g: hit.protein_g,
    carbs_g: hit.carbs_g,
    fats_g: hit.fats_g,
  };
  return {
    items: [{ name: mergeName(hit.name, hit.brand), portion: hit.portion, ...macros }],
    total: macros,
    confidence: hit.confidence,
    notes: "",
  };
}
