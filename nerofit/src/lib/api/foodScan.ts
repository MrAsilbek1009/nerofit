import { supabase } from "@/lib/supabase";

// Shape returned by the `food-analysis` Edge Function (Claude vision estimate).
// Estimates, not medical-grade — always shown editable before logging.
export type FoodScanMacros = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

export type FoodScanItem = FoodScanMacros & {
  name: string;
  portion: string;
};

export type FoodScanConfidence = "high" | "medium" | "low";

export type FoodScanResult = {
  items: FoodScanItem[];
  total: FoodScanMacros;
  confidence: FoodScanConfidence;
  notes: string;
};

/**
 * Send a resized base64 JPEG to the `food-analysis` Edge Function and get back
 * Claude's macro estimate. Mirrors `sendChatMessage` (chat.ts): the JWT is
 * attached explicitly because `functions.invoke` does not reliably forward it.
 */
export async function analyzeFoodPhoto(
  imageBase64: string,
  mediaType: string,
  photoPath?: string | null,
): Promise<FoodScanResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated — please log in again.");

  const { data, error } = await supabase.functions.invoke("food-analysis", {
    // `photo_path` is stored on the food_scans row by the Edge Function; an
    // older (un-updated) function simply ignores the extra field.
    body: { image_base64: imageBase64, media_type: mediaType, photo_path: photoPath ?? null },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    // FunctionsHttpError hides the real reason in `context` (the Response).
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.text === "function") {
      const body = await ctx.text().catch(() => "");
      throw new Error(`HTTP ${ctx.status}: ${body || error.message}`);
    }
    throw error;
  }
  return data as FoodScanResult;
}

// One stored scan (history). `food_scans` isn't in the generated db.ts yet, so —
// like the membership tables — we query by string and cast the row shape.
export type FoodScanRecord = {
  id: string;
  photo_path: string | null;
  result: FoodScanResult;
  created_at: string;
  // Short-lived signed URL, attached client-side when a photo exists (see
  // signScanPhotos). Absent until the food-photos bucket is set up.
  photoUrl?: string;
};

// Past scans (AI photo + recorded barcode/search), newest first.
export async function listFoodScans(
  userId: string,
  limit = 50,
): Promise<FoodScanRecord[]> {
  const { data, error } = await supabase
    .from("food_scans")
    .select("id, photo_path, result, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FoodScanRecord[];
}

export async function deleteFoodScan(id: string): Promise<void> {
  const { error } = await supabase.from("food_scans").delete().eq("id", id);
  if (error) throw error;
}

// Record a barcode/search estimate to history (the AI photo path is recorded
// server-side by the Edge Function). Best-effort — callers ignore failures.
export async function recordFoodScan(
  userId: string,
  result: FoodScanResult,
  photoPath: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from("food_scans")
    .insert({ user_id: userId, result, photo_path: photoPath } as never);
  if (error) throw error;
}
