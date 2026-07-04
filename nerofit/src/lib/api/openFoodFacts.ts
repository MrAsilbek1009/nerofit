import type { FoodScanResult } from "@/lib/api/foodScan";
import {
  parseOffProduct,
  parseOffSearch,
  type FoodSearchHit,
} from "@/lib/nutrition/offParse";

// OpenFoodFacts (OFF) is a free, public food database — no API key or secret, so
// these calls are safe from the client (unlike the LLM key, which stays in the
// Edge Function). Results feed the same result editor as the AI photo scan.
const BASE = "https://world.openfoodfacts.org";
// OFF asks clients to identify themselves with a descriptive User-Agent.
const USER_AGENT = "Nerofit/1.0 (nerofit fitness app)";
const TIMEOUT_MS = 12000;
const PRODUCT_FIELDS =
  "code,product_name,brands,serving_size,serving_quantity,nutriments";

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

// Look up a scanned barcode. Returns null when OFF has no usable product (either
// unknown code or missing name/calories).
export async function lookupBarcode(code: string): Promise<FoodScanResult | null> {
  const clean = code.trim();
  if (!clean) return null;
  const url = `${BASE}/api/v2/product/${encodeURIComponent(clean)}.json?fields=${PRODUCT_FIELDS}`;
  const json = await fetchJson(url);
  const status = (json as { status?: unknown }).status;
  const product = (json as { product?: unknown }).product;
  if (status !== 1 || !product) return null;
  return parseOffProduct(product);
}

// Search foods by name. Empty/short queries short-circuit to no results.
export async function searchFoods(query: string): Promise<FoodSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=20&fields=${PRODUCT_FIELDS}`;
  const json = await fetchJson(url);
  return parseOffSearch(json);
}
