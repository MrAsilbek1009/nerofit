import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Account deletion (App Store / Play Store requirement).
//
// Flow: the app sends the user's access token. We verify it with the anon
// client, then use the service-role client's admin API to delete the auth
// user. Every user-owned table references auth.users(id) ON DELETE CASCADE,
// so deleting the auth user wipes profiles, goals, body_metrics, sessions,
// exercise_logs, chat, meal/supplement logs, water/health metrics — all of it.
//
// Secrets used (auto-injected by the Supabase runtime — no extra config):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // 1. Identify the caller from their JWT (anon key + their bearer token).
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized", detail: userError?.message }, 401);
    }

    // 2. Delete the auth user with the service-role admin client.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set on the function" }, 500);
    }
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return json({ error: "Delete failed", detail: deleteError.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: "Function crashed", detail: String(e instanceof Error ? e.message : e) }, 500);
  }
});
