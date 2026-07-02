import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

// Payments webhook (Stage 2) — called by the payment PROVIDER, not the app.
// Route by ?provider=payme | ?provider=click. Deploy with `--no-verify-jwt`
// (there is no user JWT — auth is Payme Basic-Auth / Click MD5 signature).
//
// Flow recap: `membership-checkout` created a pending membership + a "created"
// payment whose id is the order reference. Here we validate the provider call,
// flip the payment to paid, and activate the membership (compute end_date).
//
// Secrets (see PHASE15_STAGE2_HANDOFF.md):
//   PAYME_MERCHANT_KEY   — Payme Merchant API key (Basic-Auth password)
//   CLICK_SECRET_KEY     — Click secret key (MD5 signature)
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

// Payme transaction states.
const CREATED = 1;
const PERFORMED = 2;
const CANCELLED = -1;
const CANCELLED_AFTER = -2;

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Activate the membership for a paid payment: status=active with start/end dates
// derived from the plan duration. Idempotent — safe to call twice.
async function activateMembership(db: SupabaseClient, membershipId: string): Promise<void> {
  const { data: m } = await db
    .from("memberships")
    .select("id, plan_id")
    .eq("id", membershipId)
    .maybeSingle();
  if (!m) return;
  const { data: plan } = await db
    .from("membership_plans")
    .select("duration_days")
    .eq("id", m.plan_id)
    .maybeSingle();
  const days = plan?.duration_days ?? 30;
  const start = new Date();
  const end = new Date(start.getTime() + days * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  await db
    .from("memberships")
    .update({ status: "active", start_date: iso(start), end_date: iso(end) })
    .eq("id", membershipId);
}

async function cancelMembership(db: SupabaseClient, membershipId: string): Promise<void> {
  await db.from("memberships").update({ status: "cancelled" }).eq("id", membershipId);
}

// ── Payme (JSON-RPC 2.0) ──────────────────────────────────────────────────
type Localized = { ru: string; uz: string; en: string };
function msg(text: string): Localized {
  return { ru: text, uz: text, en: text };
}
function rpcError(id: unknown, code: number, message: string, data?: unknown) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message: msg(message), data } }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
function rpcOk(id: unknown, result: unknown) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function handlePayme(req: Request): Promise<Response> {
  // 1. Basic-Auth: Payme sends `Basic base64("Paycom:" + MERCHANT_KEY)`.
  const key = Deno.env.get("PAYME_MERCHANT_KEY");
  const expected = "Basic " + btoa("Paycom:" + (key ?? ""));
  if (!key || req.headers.get("Authorization") !== expected) {
    return rpcError(null, -32504, "Insufficient privilege to perform this method");
  }

  const rpc = await req.json().catch(() => null);
  if (!rpc || typeof rpc.method !== "string") {
    return rpcError(rpc?.id ?? null, -32600, "Invalid Request");
  }
  const { id, method, params } = rpc as { id: unknown; method: string; params: any };
  const db = admin();

  switch (method) {
    case "CheckPerformTransaction": {
      const orderId = params?.account?.order_id as string | undefined;
      const { data: p } = orderId
        ? await db.from("payments").select("*").eq("id", orderId).eq("provider", "payme").maybeSingle()
        : { data: null };
      if (!p) return rpcError(id, -31050, "Order not found");
      if (p.status !== "created") return rpcError(id, -31008, "Unable to perform operation");
      if (Number(params.amount) !== p.amount_uzs * 100) return rpcError(id, -31001, "Wrong amount");
      return rpcOk(id, { allow: true });
    }

    case "CreateTransaction": {
      const orderId = params?.account?.order_id as string | undefined;
      const { data: p } = orderId
        ? await db.from("payments").select("*").eq("id", orderId).eq("provider", "payme").maybeSingle()
        : { data: null };
      if (!p) return rpcError(id, -31050, "Order not found");

      // Idempotent: same Payme txn id → echo existing create.
      if (p.provider_txn) {
        if (p.provider_txn === params.id) {
          return rpcOk(id, { create_time: p.create_time, transaction: p.id, state: p.provider_state });
        }
        return rpcError(id, -31008, "Order already has another transaction");
      }
      if (p.status !== "created") return rpcError(id, -31008, "Unable to perform operation");
      if (Number(params.amount) !== p.amount_uzs * 100) return rpcError(id, -31001, "Wrong amount");

      await db
        .from("payments")
        .update({ provider_txn: params.id, provider_state: CREATED, create_time: params.time })
        .eq("id", p.id);
      return rpcOk(id, { create_time: params.time, transaction: p.id, state: CREATED });
    }

    case "PerformTransaction": {
      const { data: p } = await db
        .from("payments").select("*").eq("provider_txn", params.id).eq("provider", "payme").maybeSingle();
      if (!p) return rpcError(id, -31003, "Transaction not found");
      if (p.provider_state === PERFORMED) {
        return rpcOk(id, { transaction: p.id, perform_time: p.perform_time, state: PERFORMED });
      }
      if (p.provider_state !== CREATED) return rpcError(id, -31008, "Unable to perform operation");

      const now = Date.now();
      await db
        .from("payments")
        .update({ provider_state: PERFORMED, perform_time: now, status: "paid", paid_at: new Date(now).toISOString() })
        .eq("id", p.id);
      if (p.membership_id) await activateMembership(db, p.membership_id);
      return rpcOk(id, { transaction: p.id, perform_time: now, state: PERFORMED });
    }

    case "CancelTransaction": {
      const { data: p } = await db
        .from("payments").select("*").eq("provider_txn", params.id).eq("provider", "payme").maybeSingle();
      if (!p) return rpcError(id, -31003, "Transaction not found");

      // Idempotent: already cancelled → echo.
      if (p.provider_state === CANCELLED || p.provider_state === CANCELLED_AFTER) {
        return rpcOk(id, { transaction: p.id, cancel_time: p.cancel_time, state: p.provider_state });
      }
      const now = Date.now();
      const newState = p.provider_state === PERFORMED ? CANCELLED_AFTER : CANCELLED;
      await db
        .from("payments")
        .update({ provider_state: newState, cancel_time: now, cancel_reason: params.reason, status: "cancelled" })
        .eq("id", p.id);
      if (p.membership_id) await cancelMembership(db, p.membership_id);
      return rpcOk(id, { transaction: p.id, cancel_time: now, state: newState });
    }

    case "CheckTransaction": {
      const { data: p } = await db
        .from("payments").select("*").eq("provider_txn", params.id).eq("provider", "payme").maybeSingle();
      if (!p) return rpcError(id, -31003, "Transaction not found");
      return rpcOk(id, {
        create_time: p.create_time ?? 0,
        perform_time: p.perform_time ?? 0,
        cancel_time: p.cancel_time ?? 0,
        transaction: p.id,
        state: p.provider_state,
        reason: p.cancel_reason ?? null,
      });
    }

    case "GetStatement": {
      const { data: rows } = await db
        .from("payments")
        .select("*")
        .eq("provider", "payme")
        .gte("create_time", params.from)
        .lte("create_time", params.to);
      return rpcOk(id, {
        transactions: (rows ?? []).map((p) => ({
          id: p.provider_txn,
          time: p.create_time,
          amount: p.amount_uzs * 100,
          account: { order_id: p.id },
          create_time: p.create_time ?? 0,
          perform_time: p.perform_time ?? 0,
          cancel_time: p.cancel_time ?? 0,
          transaction: p.id,
          state: p.provider_state,
          reason: p.cancel_reason ?? null,
        })),
      });
    }

    default:
      return rpcError(id, -32601, "Method not found");
  }
}

// ── Click (Prepare / Complete) ────────────────────────────────────────────
async function md5(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("MD5", new TextEncoder().encode(s));
  return encodeHex(new Uint8Array(digest));
}
function clickResult(fields: Record<string, unknown>): Response {
  return new Response(JSON.stringify(fields), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function handleClick(req: Request): Promise<Response> {
  const secret = Deno.env.get("CLICK_SECRET_KEY");
  const form = await req.formData().catch(() => null);
  if (!secret || !form) return clickResult({ error: -8, error_note: "Error in request from click" });

  const g = (k: string) => (form.get(k) as string | null) ?? "";
  const clickTransId = g("click_trans_id");
  const serviceId = g("service_id");
  const merchantTransId = g("merchant_trans_id"); // = our payment id
  const merchantPrepareId = g("merchant_prepare_id");
  const amount = g("amount");
  const action = g("action"); // "0" prepare | "1" complete
  const signTime = g("sign_time");
  const signString = g("sign_string");

  // Signature: Complete includes merchant_prepare_id between merchant_trans_id and amount.
  const base =
    action === "1"
      ? clickTransId + serviceId + secret + merchantTransId + merchantPrepareId + amount + action + signTime
      : clickTransId + serviceId + secret + merchantTransId + amount + action + signTime;
  if ((await md5(base)) !== signString) {
    return clickResult({ error: -1, error_note: "SIGN CHECK FAILED!" });
  }

  const db = admin();
  const { data: p } = merchantTransId
    ? await db.from("payments").select("*").eq("id", merchantTransId).eq("provider", "click").maybeSingle()
    : { data: null };
  if (!p) return clickResult({ error: -5, error_note: "Order not found" });
  if (Number(amount) !== p.amount_uzs) return clickResult({ error: -2, error_note: "Incorrect amount" });
  if (p.status === "cancelled") return clickResult({ error: -9, error_note: "Transaction cancelled" });

  if (action === "0") {
    // Prepare: reserve the order.
    if (p.status === "paid") return clickResult({ error: -4, error_note: "Already paid" });
    await db.from("payments").update({ provider_txn: clickTransId, provider_state: CREATED }).eq("id", p.id);
    return clickResult({
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      merchant_prepare_id: p.id,
      error: 0,
      error_note: "Success",
    });
  }

  if (action === "1") {
    // Complete: confirm payment and activate.
    if (merchantPrepareId !== p.id) return clickResult({ error: -6, error_note: "Transaction does not exist" });
    if (p.status === "paid") {
      return clickResult({
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        merchant_confirm_id: p.id,
        error: 0,
        error_note: "Success",
      });
    }
    await db
      .from("payments")
      .update({ provider_state: PERFORMED, status: "paid", paid_at: new Date().toISOString() })
      .eq("id", p.id);
    if (p.membership_id) await activateMembership(db, p.membership_id);
    return clickResult({
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      merchant_confirm_id: p.id,
      error: 0,
      error_note: "Success",
    });
  }

  return clickResult({ error: -3, error_note: "Action not found" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });
  const provider = new URL(req.url).searchParams.get("provider");
  try {
    if (provider === "payme") return await handlePayme(req);
    if (provider === "click") return await handleClick(req);
    return new Response(JSON.stringify({ error: "Unknown provider" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "crash", detail: String(e instanceof Error ? e.message : e) }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }
});
