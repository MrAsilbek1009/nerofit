// Uploads exercise demo clips to Supabase Storage and links them in the
// exercise_videos table. Run this once the trainer has recorded the videos.
//
// File naming: each file must be named <exercise_code>.mp4 (e.g. sq001.mp4,
// pu002.mp4) — the code matches exercises.code from the library.
//
// One-time setup: in the Supabase dashboard create a PUBLIC bucket named
// "exercise-videos" (Storage -> New bucket -> Public on).
//
// Run (service role key is privileged — never commit it; use a local env):
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
//   node scripts/upload-exercise-videos.mjs ./videos

import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DIR = process.argv[2] || "./videos";
const BUCKET = "exercise-videos";
const VIDEO_EXT = [".mp4", ".mov", ".m4v"];

if (!URL || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

const files = readdirSync(DIR).filter((f) =>
  VIDEO_EXT.includes(extname(f).toLowerCase()),
);
if (files.length === 0) {
  console.error(`No video files (${VIDEO_EXT.join(", ")}) in ${DIR}`);
  process.exit(1);
}

let ok = 0;
let skipped = 0;
for (const file of files) {
  const code = basename(file, extname(file));

  const { data: ex, error: exErr } = await supabase
    .from("exercises")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (exErr) {
    console.error(`${code}: lookup failed — ${exErr.message}`);
    continue;
  }
  if (!ex) {
    console.warn(`${code}: no exercise with this code — skipped`);
    skipped += 1;
    continue;
  }

  const path = `${code}${extname(file).toLowerCase()}`;
  const body = readFileSync(join(DIR, file));
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: "video/mp4", upsert: true });
  if (upErr) {
    console.error(`${code}: upload failed — ${upErr.message}`);
    continue;
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // One demo clip per exercise — replace any existing storage link.
  await supabase
    .from("exercise_videos")
    .delete()
    .eq("exercise_id", ex.id)
    .eq("provider", "storage");
  const { error: insErr } = await supabase
    .from("exercise_videos")
    .insert({ exercise_id: ex.id, url: pub.publicUrl, provider: "storage" });
  if (insErr) {
    console.error(`${code}: link failed — ${insErr.message}`);
    continue;
  }
  console.log(`${code}: linked`);
  ok += 1;
}

console.log(`\nDone: ${ok} linked, ${skipped} skipped (no matching code).`);
