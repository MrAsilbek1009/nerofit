import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Photo → calories. Claude is multimodal, so the same Anthropic key that powers
// the AI coach also does vision here. Cheapest/fastest model since it's called
// often (see AI-INTEGRATION.md). Swap the id in one place to change it.
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";

// Per-user rate limits (protect the Anthropic bill from abuse). Counted from the
// user's own food_scans via RLS — no extra table needed. Overridable with the
// FOOD_SCAN_DAILY_LIMIT / FOOD_SCAN_BURST_LIMIT function secrets.
const DAILY_LIMIT = Number(Deno.env.get("FOOD_SCAN_DAILY_LIMIT") ?? "30");
const BURST_LIMIT = Number(Deno.env.get("FOOD_SCAN_BURST_LIMIT") ?? "4"); // per 60s

const SYSTEM =
  `You are a nutrition vision assistant. Identify the foods in the image and ` +
  `estimate portion size and macros. If portion is ambiguous, assume a typical ` +
  `serving and lower the confidence. Respond with ONLY valid JSON, no markdown ` +
  `and no prose, matching exactly:\n` +
  `{"items":[{"name":"","portion":"","kcal":0,"protein_g":0,"carbs_g":0,"fats_g":0}],` +
  `"total":{"kcal":0,"protein_g":0,"carbs_g":0,"fats_g":0},` +
  `"confidence":"high|medium|low","notes":""}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retry-count",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized", detail: userError?.message }, 401);
    }

    const { image_base64, media_type } = await req.json();
    if (!image_base64 || !media_type) {
      return json({ error: "image_base64 and media_type required" }, 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "ANTHROPIC_API_KEY secret is not set on the function" }, 500);
    }

    // Rate limit before spending any tokens. RLS scopes these counts to the
    // caller's own scans, so a user can't see or affect anyone else's.
    const nowMs = Date.now();
    const since24h = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
    const since60s = new Date(nowMs - 60 * 1000).toISOString();
    const [{ count: dayCount }, { count: burstCount }] = await Promise.all([
      supabase.from("food_scans").select("id", { count: "exact", head: true })
        .gte("created_at", since24h),
      supabase.from("food_scans").select("id", { count: "exact", head: true })
        .gte("created_at", since60s),
    ]);
    if ((burstCount ?? 0) >= BURST_LIMIT) {
      return json({ error: "rate_limited", scope: "burst" }, 429);
    }
    if ((dayCount ?? 0) >= DAILY_LIMIT) {
      return json({ error: "rate_limited", scope: "daily" }, 429);
    }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type, data: image_base64 } },
            { type: "text", text: "Analyze this meal." },
          ],
        }],
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return json({ error: "LLM error", status: upstream.status, detail: err }, 502);
    }

    const data = await upstream.json();
    const raw: string = data.content?.[0]?.text ?? "{}";
    let result: unknown;
    try {
      result = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      return json({ error: "parse_failed", raw }, 502);
    }

    // Keep a record (also feeds the rate-limit counts above). The user can still
    // edit the estimate before logging it to meal_logs.
    await supabase.from("food_scans").insert({ user_id: user.id, result });

    return json(result);
  } catch (e) {
    // Any unhandled error returns WITH CORS headers so the browser can read it.
    return json({ error: "Function crashed", detail: String(e instanceof Error ? e.message : e) }, 500);
  }
});
