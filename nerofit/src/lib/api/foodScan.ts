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
): Promise<FoodScanResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated — please log in again.");

  const { data, error } = await supabase.functions.invoke("food-analysis", {
    body: { image_base64: imageBase64, media_type: mediaType },
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
