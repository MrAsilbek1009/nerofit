import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const MAX_HISTORY = 20;

// Per-user rate limits (protect the Anthropic bill from abuse). Counted from
// the user's own chat_messages via RLS — no extra table needed. Overridable
// with the AI_DAILY_LIMIT / AI_BURST_LIMIT function secrets.
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "50");
const BURST_LIMIT = Number(Deno.env.get("AI_BURST_LIMIT") ?? "6"); // per 60s

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

    const { thread_id, message } = await req.json();
    if (!thread_id || !message) {
      return json({ error: "thread_id and message required" }, 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "ANTHROPIC_API_KEY secret is not set on the function" }, 500);
    }

    // Rate limit before spending any tokens. RLS scopes these counts to the
    // caller's own messages, so a user can't see or affect anyone else's.
    const nowMs = Date.now();
    const since24h = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
    const since60s = new Date(nowMs - 60 * 1000).toISOString();
    const [{ count: dayCount }, { count: burstCount }] = await Promise.all([
      supabase.from("chat_messages").select("id", { count: "exact", head: true })
        .eq("role", "user").gte("created_at", since24h),
      supabase.from("chat_messages").select("id", { count: "exact", head: true })
        .eq("role", "user").gte("created_at", since60s),
    ]);
    if ((burstCount ?? 0) >= BURST_LIMIT) {
      return json({ error: "rate_limited", scope: "burst" }, 429);
    }
    if ((dayCount ?? 0) >= DAILY_LIMIT) {
      return json({ error: "rate_limited", scope: "daily" }, 429);
    }

    const [{ data: profile }, { data: goals }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("name, focus").eq("id", user.id).maybeSingle(),
      supabase.from("goals").select("focus, activity_level, equipment, injuries").eq("user_id", user.id).maybeSingle(),
      supabase.from("chat_messages").select("role, content")
        .eq("thread_id", thread_id).order("created_at", { ascending: true }).limit(MAX_HISTORY),
    ]);

    const injuriesList = (goals?.injuries ?? []).join(", ") || "none";
    const system =
      `You are Forge, a personal AI fitness coach inside the Nerofit app. ` +
      `Be concise, warm, and practical. Personalize advice using the user's data. ` +
      `Keep responses under 4 sentences unless the user asks for more detail. ` +
      `You are not a doctor — for medical concerns, recommend a professional.\n\n` +
      `User: ${profile?.name ?? "Athlete"}. ` +
      `Goal: ${goals?.focus ?? "stay fit"}. ` +
      `Equipment: ${goals?.equipment ?? "unknown"}. ` +
      `Activity level: ${goals?.activity_level ?? "unknown"}. ` +
      `Injuries/limitations: ${injuriesList}.`;

    const messages = [
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 512, system, messages }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return json({ error: "LLM error", status: upstream.status, detail: err }, 502);
    }

    const result = await upstream.json();
    const reply: string =
      result.content?.[0]?.text ?? "I couldn't generate a response. Please try again.";

    await Promise.all([
      supabase.from("chat_messages").insert({ thread_id, role: "user", content: message }),
      supabase.from("chat_messages").insert({ thread_id, role: "assistant", content: reply }),
      supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", thread_id),
    ]);

    return json({ reply });
  } catch (e) {
    // Any unhandled error returns WITH CORS headers so the browser can read it.
    return json({ error: "Function crashed", detail: String(e instanceof Error ? e.message : e) }, 500);
  }
});
