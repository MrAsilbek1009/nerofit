import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const MAX_HISTORY = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const { thread_id, message } = await req.json();
  if (!thread_id || !message) {
    return new Response(JSON.stringify({ error: "thread_id and message required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const [{ data: profile }, { data: goals }, { data: history }] = await Promise.all([
    supabase.from("profiles").select("name, focus").eq("id", user.id).single(),
    supabase.from("goals").select("focus, activity_level, equipment, injuries").eq("user_id", user.id).single(),
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
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 512, system, messages }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(JSON.stringify({ error: "LLM error", detail: err }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const result = await upstream.json();
  const reply: string = result.content?.[0]?.text ?? "I couldn't generate a response. Please try again.";

  await Promise.all([
    supabase.from("chat_messages").insert({ thread_id, role: "user", content: message }),
    supabase.from("chat_messages").insert({ thread_id, role: "assistant", content: reply }),
    supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", thread_id),
  ]);

  return new Response(JSON.stringify({ reply }), {
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
