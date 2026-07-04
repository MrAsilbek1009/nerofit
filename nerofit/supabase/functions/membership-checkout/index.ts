import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Membership checkout (Stage 2).
//
// The app calls this with the user's JWT and a { plan_id, provider }. We create
// a pending membership + a "created" payment (server-side, since RLS blocks
// client writes), then return a provider checkout URL that embeds the payment
// id as the order reference. The user pays on Payme/Click; the provider then
// calls `payments-webhook`, which flips the payment to paid and activates the
// membership.
//
// Secrets (set via `supabase secrets set`, see PHASE15_STAGE2_HANDOFF.md):
//   PAYME_MERCHANT_ID          — Payme cashbox (merchant) id, for the checkout URL
//   CLICK_SERVICE_ID           — Click service id
//   CLICK_MERCHANT_ID          — Click merchant id
//   PAYME_CHECKOUT_URL         — optional override (default https://checkout.paycom.uz/)
//   MEMBERSHIP_RETURN_URL      — optional deep link back into the app (default nerofit://membership)
// Auto-injected: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

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

type Provider = "payme" | "click";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization") ?? "";

    // 1. Identify the caller from their JWT.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized", detail: userError?.message }, 401);
    }

    // 2. Validate input.
    const body = await req.json().catch(() => ({}));
    const planId = typeof body.plan_id === "string" ? body.plan_id : "";
    const provider = body.provider as Provider;
    if (!planId || (provider !== "payme" && provider !== "click")) {
      return json({ error: "plan_id and provider (payme|click) are required" }, 400);
    }

    // 3. Load the plan (public read is fine, but use service role for a clean read).
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set on the function" }, 500);
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    const { data: plan, error: planError } = await admin
      .from("membership_plans")
      .select("id, price_app_uzs, is_active")
      .eq("id", planId)
      .maybeSingle();
    if (planError) return json({ error: "Plan lookup failed", detail: planError.message }, 500);
    if (!plan || !plan.is_active) return json({ error: "Plan not found or inactive" }, 404);

    // 4. Create the pending membership + created payment (the order).
    const { data: membership, error: mErr } = await admin
      .from("memberships")
      .insert({ user_id: user.id, plan_id: plan.id, status: "pending" })
      .select("id")
      .single();
    if (mErr) return json({ error: "Could not create membership", detail: mErr.message }, 500);

    const { data: payment, error: pErr } = await admin
      .from("payments")
      .insert({
        user_id: user.id,
        membership_id: membership.id,
        amount_uzs: plan.price_app_uzs,
        provider,
        status: "created",
      })
      .select("id")
      .single();
    if (pErr) return json({ error: "Could not create payment", detail: pErr.message }, 500);

    // 5. Build the provider checkout URL, embedding payment.id as the order ref.
    const returnUrl =
      Deno.env.get("MEMBERSHIP_RETURN_URL") ?? "nerofit://membership";
    const amount = plan.price_app_uzs;

    let checkoutUrl: string;
    if (provider === "payme") {
      const merchantId = Deno.env.get("PAYME_MERCHANT_ID");
      if (!merchantId) return json({ error: "PAYME_MERCHANT_ID not set" }, 500);
      const base = Deno.env.get("PAYME_CHECKOUT_URL") ?? "https://checkout.paycom.uz/";
      // Payme amounts are in tiyin (1 so'm = 100 tiyin). The `ac.order_id` key
      // must match the account field configured in the Payme merchant cabinet.
      const params = `m=${merchantId};ac.order_id=${payment.id};a=${amount * 100};c=${returnUrl};l=uz`;
      checkoutUrl = base + btoa(params);
    } else {
      const serviceId = Deno.env.get("CLICK_SERVICE_ID");
      const merchantId = Deno.env.get("CLICK_MERCHANT_ID");
      if (!serviceId || !merchantId) {
        return json({ error: "CLICK_SERVICE_ID / CLICK_MERCHANT_ID not set" }, 500);
      }
      const qs = new URLSearchParams({
        service_id: serviceId,
        merchant_id: merchantId,
        amount: String(amount),
        transaction_param: payment.id,
        return_url: returnUrl,
      });
      checkoutUrl = `https://my.click.uz/services/pay?${qs.toString()}`;
    }

    return json({ checkoutUrl, payment_id: payment.id, membership_id: membership.id });
  } catch (e) {
    return json(
      { error: "Function crashed", detail: String(e instanceof Error ? e.message : e) },
      500,
    );
  }
});
