import { supabase } from "@/lib/supabase";
import type { FoodScanResult } from "@/lib/api/foodScan";
import { foodScanResultFromHit, type FoodSearchHit } from "@/lib/nutrition/offParse";
import type { FoodInput } from "@/lib/nutrition/foodInput";

// The regional food database (Uzbek / Central Asian dishes + community foods).
// `foods` isn't in the generated db.ts yet, so — like food_scans / membership —
// we query by string and cast the row shape.
export type LocalFood = {
  id: string;
  name: string;
  brand: string | null;
  region: string | null;
  barcode: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  serving_label: string | null;
  serving_grams: number | null;
  is_verified: boolean;
  source: string;
};

const FOOD_FIELDS =
  "id, name, brand, region, barcode, kcal, protein_g, carbs_g, fats_g, serving_label, serving_grams, is_verified, source";

// Map a stored food to a search hit so it merges with OFF results and reuses the
// shared result editor (foodScanResultFromHit).
export function localFoodToHit(f: LocalFood): FoodSearchHit {
  return {
    code: f.barcode ?? f.id,
    name: f.name,
    brand: f.brand ?? "",
    portion:
      f.serving_label ?? (f.serving_grams != null ? `${f.serving_grams} g` : "1 serving"),
    kcal: f.kcal,
    protein_g: f.protein_g,
    carbs_g: f.carbs_g,
    fats_g: f.fats_g,
    confidence: "high",
    verified: f.is_verified,
    origin: "local",
  };
}

// Local-first name search. Verified foods rank ahead of the user's own pending
// submissions. RLS already scopes rows to verified-or-own.
export async function searchLocalFoods(query: string, limit = 10): Promise<FoodSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_FIELDS)
    .ilike("name", `%${q}%`)
    .order("is_verified", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as LocalFood[]).map(localFoodToHit);
}

// Look up a scanned barcode in the local DB (checked before OpenFoodFacts).
export async function lookupLocalBarcode(code: string): Promise<FoodScanResult | null> {
  const clean = code.trim();
  if (!clean) return null;
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_FIELDS)
    .eq("barcode", clean)
    .order("is_verified", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? foodScanResultFromHit(localFoodToHit(data as LocalFood)) : null;
}

// Crowdsource: add a community food. RLS forces is_verified=false / source=community;
// it becomes usable by the submitter immediately and public once moderated.
export async function submitFood(userId: string, input: FoodInput): Promise<void> {
  const { error } = await supabase.from("foods").insert({
    name: input.name,
    brand: input.brand || null,
    barcode: input.barcode || null,
    region: "uz",
    kcal: input.kcal,
    protein_g: input.protein_g,
    carbs_g: input.carbs_g,
    fats_g: input.fats_g,
    serving_label: input.serving_label || null,
    serving_grams: input.serving_grams,
    source: "community",
    is_verified: false,
    created_by: userId,
  } as never);
  if (error) throw error;
}
