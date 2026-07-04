import { supabase } from "@/lib/supabase";
import { base64ToBytes } from "@/lib/nutrition/base64";
import type { FoodScanRecord } from "@/lib/api/foodScan";

// Private bucket for scan photos. Objects are namespaced by user id
// (`{userId}/...`) so Storage RLS can scope access per user.
const BUCKET = "food-photos";
const SIGNED_URL_TTL = 3600; // 1 hour

// Upload a scan photo to the user's folder. Best-effort: returns the storage
// path on success, or null if the bucket/policies aren't set up yet — the scan
// flow then continues without a photo (photo_path stays null).
export async function uploadScanPhoto(
  userId: string,
  base64: string,
  mediaType: string,
): Promise<string | null> {
  try {
    const bytes = base64ToBytes(base64);
    if (bytes.length === 0) return null;
    const ext = mediaType === "image/png" ? "png" : "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: mediaType, upsert: false });
    return error ? null : path;
  } catch {
    return null;
  }
}

// Attach a short-lived signed URL to records that have a stored photo. Records
// without a photo — or all of them if signing fails — are returned unchanged.
export async function signScanPhotos(
  records: FoodScanRecord[],
): Promise<FoodScanRecord[]> {
  const paths = records
    .map((r) => r.photo_path)
    .filter((p): p is string => !!p);
  if (paths.length === 0) return records;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL);
    if (error || !data) return records;

    const urlByPath = new Map<string, string>();
    for (const item of data) {
      if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
    }
    return records.map((r) => {
      const url = r.photo_path ? urlByPath.get(r.photo_path) : undefined;
      return url ? { ...r, photoUrl: url } : r;
    });
  } catch {
    return records;
  }
}
