import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin membership verification panel (Stage 3).
//
// A self-contained gym-staff web page — no separate hosting. Staff open the
// function URL in a browser, enter the shared panel password, then scan a
// member's QR (which encodes their user_id) or type it in. We look up the
// member's latest membership with the service role (bypassing owner-RLS) and
// show active / expired. For cash-at-the-gym payments there's also a manual
// "activate" action (this is the home for Stage-1 admin activation).
//
// Deploy with `--no-verify-jwt` (public page; the password is the boundary).
// Secret: ADMIN_PANEL_PASSWORD  (set via `supabase secrets set`).
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const jsonHeaders = { "content-type": "application/json" };
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function today(): Date {
  return new Date(new Date().toDateString());
}
function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000));
}

// ── POST actions (all require the panel password) ─────────────────────────
async function handlePost(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const password = Deno.env.get("ADMIN_PANEL_PASSWORD");
  if (!password) return json({ error: "ADMIN_PANEL_PASSWORD not set" }, 500);
  if (body.password !== password) return json({ error: "Wrong password" }, 401);

  const db = admin();
  const action = body.action as string;

  if (action === "plans") {
    const { data } = await db
      .from("membership_plans")
      .select("id, name_uz, price_app_uzs, duration_days")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return json({ plans: data ?? [] });
  }

  if (action === "verify") {
    const userId = String(body.user_id ?? "").trim();
    if (!userId) return json({ found: false });
    const { data: m } = await db
      .from("memberships")
      .select("status, start_date, end_date, membership_plans(name_uz)")
      .eq("user_id", userId)
      .order("end_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const { data: prof } = await db
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();

    if (!prof && !m) return json({ found: false });
    const active = !!m && m.status === "active" && !!m.end_date && new Date(m.end_date) >= today();
    return json({
      found: true,
      active,
      status: m?.status ?? "none",
      name: prof?.name ?? null,
      // deno-lint-ignore no-explicit-any
      plan_name: (m as any)?.membership_plans?.name_uz ?? null,
      end_date: m?.end_date ?? null,
      days_left: m?.end_date ? daysLeft(m.end_date) : 0,
    });
  }

  if (action === "activate") {
    const userId = String(body.user_id ?? "").trim();
    const planId = String(body.plan_id ?? "").trim();
    if (!userId || !planId) return json({ error: "user_id and plan_id required" }, 400);

    const { data: plan } = await db
      .from("membership_plans")
      .select("duration_days, price_app_uzs")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) return json({ error: "Plan not found" }, 404);

    const start = today();
    const end = new Date(start.getTime() + plan.duration_days * 86_400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const { data: membership, error: mErr } = await db
      .from("memberships")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        start_date: iso(start),
        end_date: iso(end),
      })
      .select("id")
      .single();
    if (mErr) return json({ error: mErr.message }, 500);

    // Paper trail for cash payments.
    await db.from("payments").insert({
      user_id: userId,
      membership_id: membership.id,
      amount_uzs: plan.price_app_uzs,
      provider: "manual",
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    return json({ ok: true, end_date: iso(end), days_left: plan.duration_days });
  }

  return json({ error: "Unknown action" }, 400);
}

// ── The staff-facing HTML page (served on GET) ────────────────────────────
const PAGE = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>Nerofit — A'zolik tekshirish</title>
<script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
<style>
  :root { --bg:#000; --card:#141414; --line:#262626; --hi:#fff; --lo:#8a8a8a; --acc:#D4E924; --ok:#D4E924; --bad:#ff5a5a; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--hi); font-family:-apple-system,Segoe UI,Roboto,sans-serif; padding:16px; max-width:520px; margin:0 auto; }
  h1 { font-size:18px; letter-spacing:.14em; text-transform:uppercase; color:var(--lo); font-weight:700; }
  input, select, button { font-size:16px; border-radius:12px; border:1px solid var(--line); background:var(--card); color:var(--hi); padding:12px 14px; width:100%; }
  button { background:var(--acc); color:#000; border:none; font-weight:700; letter-spacing:.04em; cursor:pointer; }
  button.ghost { background:transparent; color:var(--hi); border:1px solid var(--line); }
  .row { display:flex; gap:8px; margin-top:10px; }
  .row > * { flex:1; }
  #reader { margin-top:14px; border-radius:12px; overflow:hidden; }
  .card { background:var(--card); border-radius:16px; padding:18px; margin-top:16px; border:1px solid var(--line); }
  .badge { display:inline-block; padding:6px 12px; border-radius:999px; font-weight:700; font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  .badge.ok { background:var(--ok); color:#000; } .badge.bad { background:var(--bad); color:#000; }
  .muted { color:var(--lo); font-size:14px; } .big { font-size:26px; font-weight:800; margin:8px 0; }
  label { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--lo); display:block; margin:14px 0 6px; }
</style>
</head>
<body>
  <h1>Nerofit · A'zolik</h1>
  <label>Panel paroli</label>
  <input id="pwd" type="password" placeholder="parol" autocomplete="off" />
  <div class="row">
    <button id="scanBtn" onclick="toggleScan()">Skaner</button>
  </div>
  <div id="reader"></div>
  <label>Yoki foydalanuvchi ID</label>
  <div class="row">
    <input id="uid" placeholder="user_id" autocomplete="off" />
    <button style="flex:0 0 120px" onclick="verify(document.getElementById('uid').value)">Tekshirish</button>
  </div>
  <div id="out"></div>

<script>
  var scanner = null, scanning = false, plans = null;
  function el(t,c,txt){ var e=document.createElement(t); if(c)e.className=c; if(txt!=null)e.textContent=txt; return e; }
  function out(){ return document.getElementById('out'); }

  async function api(action, extra){
    var b = Object.assign({ action:action, password: document.getElementById('pwd').value }, extra||{});
    var res = await fetch(location.pathname, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(b) });
    var data = {}; try { data = await res.json(); } catch(e){}
    return { status: res.status, data: data };
  }

  function toggleScan(){
    if(scanning){ stopScan(); return; }
    scanner = new Html5Qrcode('reader');
    scanner.start({ facingMode:'environment' }, { fps:10, qrbox:240 }, function(text){
      stopScan(); document.getElementById('uid').value = text; verify(text);
    }).then(function(){ scanning = true; document.getElementById('scanBtn').textContent = 'To\\u2018xtatish'; })
      .catch(function(){ alert('Kamera ochilmadi'); });
  }
  function stopScan(){ if(scanner && scanning){ scanner.stop().catch(function(){}); } scanning=false; document.getElementById('scanBtn').textContent='Skaner'; }

  async function verify(userId){
    userId = (userId||'').trim(); if(!userId) return;
    out().innerHTML=''; out().appendChild(el('p','muted','Tekshirilmoqda…'));
    var r = await api('verify', { user_id:userId });
    if(r.status === 401){ out().innerHTML=''; out().appendChild(el('p','muted','Parol noto\\u2018g\\u2018ri')); return; }
    render(r.data, userId);
  }

  function render(d, userId){
    out().innerHTML='';
    var c = el('div','card');
    if(!d.found){ c.appendChild(el('p','muted','Foydalanuvchi topilmadi')); out().appendChild(c); return; }
    c.appendChild(el('span','badge '+(d.active?'ok':'bad'), d.active?'FAOL':'FAOL EMAS'));
    if(d.name) c.appendChild(el('div','big', d.name));
    if(d.active){
      c.appendChild(el('div',null,(d.plan_name||'')));
      c.appendChild(el('div','muted','Tugaydi: '+(d.end_date||'-')+' · '+d.days_left+' kun qoldi'));
    } else {
      c.appendChild(el('div','muted','Holat: '+d.status));
      buildActivate(c, userId);
    }
    out().appendChild(c);
  }

  async function buildActivate(c, userId){
    c.appendChild(el('label',null,'Qo\\u2018lda faollashtirish (naqd to\\u2018lov)'));
    var sel = el('select'); sel.id='plan';
    if(!plans){ var p = await api('plans'); plans = (p.data && p.data.plans) || []; }
    plans.forEach(function(pl){ var o=el('option',null, pl.name_uz+' — '+pl.price_app_uzs.toLocaleString('ru-RU')+' so\\u2018m'); o.value=pl.id; sel.appendChild(o); });
    c.appendChild(sel);
    var btn = el('button',null,'Faollashtirish'); btn.style.marginTop='10px';
    btn.onclick = async function(){ btn.disabled=true; btn.textContent='...';
      var r = await api('activate', { user_id:userId, plan_id: sel.value });
      if(r.data && r.data.ok){ verify(userId); } else { alert((r.data && r.data.error) || 'Xato'); btn.disabled=false; btn.textContent='Faollashtirish'; }
    };
    c.appendChild(btn);
  }
</script>
</body>
</html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });
  if (req.method === "POST") {
    try {
      return await handlePost(req);
    } catch (e) {
      return json({ error: String(e instanceof Error ? e.message : e) }, 500);
    }
  }
  return new Response(PAGE, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
});
