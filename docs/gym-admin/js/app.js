import { $, el, btn, escapeHtml, toast, skeleton, SVG, emptyState, errorState, fmt, uzs } from "./ui.js";
import { API, api, failed, getToken, setToken } from "./api.js";

  let staffCache = [];
  const expandedStaff = new Set();

  // ── Auth ──────────────────────────────────────────────────────────────
  async function login() {
    const pwd = $("pwd").value;
    $("loginMsg").textContent = "Tekshirilmoqda…";
    const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "login", password: pwd }) });
    let d = {}; try { d = await res.json(); } catch (e) {}
    if (res.status !== 200 || !d.token) { $("loginMsg").textContent = (d && d.error) || "Parol noto'g'ri"; return; }
    if (d.role !== "admin" && d.role !== "owner") { $("loginMsg").textContent = "Bu parol admin emas (xodim). Admin parol kerak."; return; }
    setToken(d.token); try { localStorage.setItem("na_token", getToken()); } catch (e) {}
    $("loginMsg").textContent = "";
    $("login").classList.add("hidden");
    $("dash").classList.remove("hidden");
    show("dash");
  }
  function logout() {
    try { api("logout"); } catch (e) {}
    setToken(""); try { localStorage.removeItem("na_token"); } catch (e) {}
    $("dash").classList.add("hidden"); $("login").classList.remove("hidden"); $("pwd").value = "";
  }
  // Mobile off-canvas sidebar drawer (Gymove-style).
  function toggleSidebar() {
    const sb = document.querySelector(".sidebar");
    const open = sb.classList.toggle("open");
    const bd = document.querySelector(".backdrop"); if (bd) bd.classList.toggle("show", open);
  }
  function closeSidebar() {
    const sb = document.querySelector(".sidebar"); if (sb) sb.classList.remove("open");
    const bd = document.querySelector(".backdrop"); if (bd) bd.classList.remove("show");
  }
  function show(tab) {
    closeSidebar(); // tapping a nav item closes the mobile drawer
    ["dash", "staff", "members", "finance", "plans", "content", "trainers", "audit"].forEach((t) => {
      $("sec-" + t).classList.toggle("hidden", t !== tab);
      $("tab-" + t).className = t === tab ? "on" : "off";
    });
    if (tab === "dash") loadDash();
    if (tab === "staff") loadStaff();
    if (tab === "members") { renderFilters(); loadMemberPlans(); loadMembers(false); loadFeed(); }
    if (tab === "finance") initFinance();
    if (tab === "plans") loadPlansAdmin();
    if (tab === "content") loadContent();
    if (tab === "trainers") loadTrainers();
    if (tab === "audit") loadAudit();
  }
  async function changeAdminPw() {
    const nw = $("ap-new").value.trim();
    if (!nw) { $("ap-msg").textContent = "Yangi parol kerak"; return; }
    const r = await api("admin_set_password", { new_password: nw });
    if (r.data && r.data.ok) {
      $("ap-cur").value = ""; $("ap-new").value = ""; $("ap-msg").textContent = "Parol yangilandi ✓";
    } else {
      $("ap-msg").textContent = (r.data && r.data.error) || "Xato";
    }
  }
  async function loadAudit() {
    const box = $("auditList"); skeleton(box, 5);
    const r = await api("audit_list");
    if (failed(r)) { errorState(box, loadAudit); return; }
    const list = (r.data && r.data.audit) || [];
    box.innerHTML = "";
    if (list.length === 0) { emptyState(box, "Hali yozuv yo'q.", "inbox"); return; }
    const c = el("div", "card");
    list.forEach((a) => {
      const it = el("div", "item");
      const ip = a.meta && a.meta.ip ? " · " + a.meta.ip : "";
      it.innerHTML = '<div class="between"><div style="font-weight:700">' + escapeHtml(a.action) + '</div><span class="muted">' + fmt(a.created_at) + '</span></div>'
        + '<div class="muted">' + escapeHtml(a.actor_name || "-") + ' (' + escapeHtml(a.actor_role || "-") + ')' + (a.target ? " → " + escapeHtml(String(a.target)) : "") + ip + '</div>';
      c.appendChild(it);
    });
    box.appendChild(c);
  }

  // ── Dashboard ───────────────────────────────────────────────────────────
  async function loadDash() {
    const r = await api("dashboard_stats");
    if (failed(r)) { errorState($("kpis"), loadDash); $("revChart").innerHTML = ""; $("hourChart").innerHTML = ""; return; }
    const d = r.data || {};
    renderKpis(d);
    const rev = d.revDaily || [];
    renderBars($("revChart"), rev.map((x) => x.v), rev.map((x) => x.d), -1, uzs);
    const hours = d.checkinsByHour || [];
    renderBars($("hourChart"), hours, hours.map((_, h) => h), d.peakHour == null ? -1 : d.peakHour, null);
  }
  function kpi(box, n, l, acc, icon) {
    const c = el("div", "kpi");
    c.innerHTML = (icon && SVG[icon] ? '<div class="ico">' + SVG[icon] + '</div>' : '')
      + '<div class="n' + (acc ? " acc" : "") + '">' + escapeHtml(String(n)) + '</div><div class="l">' + escapeHtml(l) + '</div>';
    box.appendChild(c);
  }
  function renderKpis(d) {
    const box = $("kpis"); box.innerHTML = "";
    kpi(box, d.active || 0, "Faol a'zo", true, "users");
    kpi(box, d.expiring7 || 0, "7 kunda tugaydi", false, "clock");
    kpi(box, d.frozen || 0, "Muzlatilgan", false, "snow");
    kpi(box, d.checkinsToday || 0, "Bugungi kelish", false, "door");
    kpi(box, uzs(d.revenueToday || 0), "Bugun daromad", true, "cash");
    kpi(box, uzs(d.revenueWeek || 0), "7 kun daromad", false, "cash");
    kpi(box, uzs(d.revenueMonth || 0), "30 kun daromad", false, "cal");
    kpi(box, d.peakHour == null ? "-" : (String(d.peakHour).padStart(2, "0") + ":00"), "Peak soat", false, "peak");
  }
  // Minimal CSS bar chart. values[], labels[], hi = highlight index (-1 none), fmt for tooltip.
  function renderBars(box, values, labels, hi, fmt) {
    box.innerHTML = "";
    const max = Math.max(1, ...values);
    const bars = el("div", "bars");
    values.forEach((v, i) => {
      const b = el("div", "bar" + (i === hi ? " hi" : "") + (v <= 0 ? " dim" : ""));
      b.style.height = Math.max(2, Math.round((v / max) * 100)) + "%";
      b.title = (labels[i] != null ? labels[i] + ": " : "") + (fmt ? fmt(v) : v);
      bars.appendChild(b);
    });
    box.appendChild(bars);
    if (values.length) {
      const lab = el("div", "barlabels");
      lab.appendChild(el("span", null, String(labels[0])));
      lab.appendChild(el("span", null, String(labels[Math.floor(values.length / 2)])));
      lab.appendChild(el("span", null, String(labels[values.length - 1])));
      box.appendChild(lab);
    }
  }

  // ── Staff management ────────────────────────────────────────────────────
  async function loadStaff() {
    const r = await api("staff_list");
    const box = $("staffList");
    if (failed(r)) { errorState(box, loadStaff); return; }
    staffCache = (r.data && r.data.staff) || [];
    box.innerHTML = "";
    if (staffCache.length === 0) { emptyState(box, "Hali xodim yo'q.", "users"); return; }
    staffCache.forEach((s) => {
      const c = el("div", "card");
      const top = el("div", "between");
      const left = el("div");
      left.innerHTML = '<div style="font-weight:700">' + escapeHtml(s.name) + ' <span class="muted">· ' + s.role + '</span></div>';
      top.appendChild(left);
      top.appendChild(el("span", "badge " + (s.is_active ? "ok" : "bad"), s.is_active ? "FAOL" : "O‘CHIQ"));
      c.appendChild(top);

      // Actions revealed by "Tahrirlash" — kept open across reloads via expandedStaff.
      const acts = el("div"); acts.style.marginTop = "10px";
      acts.style.display = expandedStaff.has(s.id) ? "block" : "none";

      const pwWrap = el("div"); pwWrap.style.display = "none"; pwWrap.style.marginTop = "8px";
      const pwInput = el("input"); pwInput.placeholder = "yangi parol"; pwInput.setAttribute("autocomplete", "off");
      pwInput.setAttribute("autocapitalize", "none"); pwInput.setAttribute("autocorrect", "off"); pwInput.setAttribute("spellcheck", "false");
      const pwSave = btn("Saqlash", "", async () => {
        const v = pwInput.value.trim(); if (!v) return;
        const rr = await api("staff_set_password", { staff_id: s.id, new_password: v });
        if (rr.data && rr.data.ok) { pwInput.value = ""; pwWrap.style.display = "none"; toast("Parol o‘zgartirildi", "ok"); }
        else { toast((rr.data && rr.data.error) || "Xato"); }
      });
      pwSave.style.marginTop = "8px";
      pwWrap.appendChild(pwInput); pwWrap.appendChild(pwSave);

      const rowA = el("div", "row");
      rowA.appendChild(btn("Parol o‘zgartirish", "ghost mini", () => { pwWrap.style.display = pwWrap.style.display === "none" ? "block" : "none"; }));
      rowA.appendChild(btn(s.is_active ? "O‘chirish" : "Yoqish", "ghost mini", () => toggleStaff(s)));
      rowA.appendChild(btn("Del", "danger mini", () => delStaff(s)));
      acts.appendChild(rowA); acts.appendChild(pwWrap);

      const edit = btn(expandedStaff.has(s.id) ? "Yopish" : "Tahrirlash", "ghost mini", () => {
        if (expandedStaff.has(s.id)) { expandedStaff.delete(s.id); acts.style.display = "none"; edit.textContent = "Tahrirlash"; }
        else { expandedStaff.add(s.id); acts.style.display = "block"; edit.textContent = "Yopish"; }
      });
      edit.style.marginTop = "10px";
      c.appendChild(edit); c.appendChild(acts);
      box.appendChild(c);
    });
  }
  async function addStaff() {
    const name = $("ns-name").value.trim(), pw = $("ns-pwd").value.trim();
    if (!name || !pw) { $("ns-msg").textContent = "Ism va parol kerak"; return; }
    const r = await api("staff_add", { name, new_password: pw });
    if (r.data && r.data.ok) { $("ns-name").value = ""; $("ns-pwd").value = ""; $("ns-msg").textContent = "Qo‘shildi ✓"; loadStaff(); }
    else { $("ns-msg").textContent = (r.data && r.data.error) || "Xato"; }
  }
  async function toggleStaff(s) { await api("staff_set_active", { staff_id: s.id, is_active: !s.is_active }); await loadStaff(); }
  async function delStaff(s) {
    if (!confirm("'" + s.name + "' o‘chirilsinmi?")) return;
    expandedStaff.delete(s.id);
    await api("staff_delete", { staff_id: s.id }); await loadStaff();
  }

  // ── Members + activity (inline accordion) ───────────────────────────────
  function memberDetailHtml(d) {
    if (!d || !d.found) return '<p class="muted">Ma’lumot yo’q.</p>';
    const frozen = !!(d.membership && d.membership.status === "frozen");
    const badgeCls = d.active ? "ok" : (frozen ? "warn" : "bad");
    const badgeTxt = d.active ? "FAOL" : (frozen ? "MUZLATILGAN" : "FAOL EMAS");
    let h = '<span class="badge ' + badgeCls + '">' + badgeTxt + '</span>';
    h += '<div class="big">' + escapeHtml(d.name || "(ismsiz)") + '</div>';
    if (d.membership) h += '<div class="muted">' + escapeHtml(d.membership.plan_name || "") + ' · tugaydi: ' + fmt(d.membership.end_date) + (frozen ? ' · muzlatilgan' : '') + '</div>';
    if (d.trainer && d.trainer.name) h += '<div class="muted">Trener: ' + escapeHtml(d.trainer.name) + '</div>';
    h += '<h2>To‘lovlar (qachon qabul bo‘ldi)</h2>';
    h += (d.payments && d.payments.length) ? d.payments.map((p) =>
      '<div class="item"><div class="between"><span>' + uzs(p.amount_uzs) + ' so‘m · ' + p.provider + '</span><span class="muted">' + p.status + '</span></div>' +
      '<div class="muted">' + fmt(p.paid_at || p.created_at) + (p.staff_name ? ' · ' + escapeHtml(p.staff_name) : '') + '</div></div>'
    ).join("") : '<p class="muted">Yo’q</p>';
    h += '<h2>Kelishlar (qachon keldi)</h2>';
    h += (d.checkins && d.checkins.length) ? d.checkins.map((c) =>
      '<div class="item"><div class="between"><span>' + fmt(c.checked_at) + '</span><span class="badge ' + (c.was_active ? "ok" : "bad") + '">' + (c.was_active ? "faol" : "emas") + '</span></div>' +
      '<div class="muted">' + escapeHtml(c.staff_name || "-") + '</div></div>'
    ).join("") : '<p class="muted">Hali kelmagan</p>';
    h += '<h2>Ichki izohlar (faqat xodimlar)</h2>';
    h += (d.notes && d.notes.length) ? d.notes.map((n) =>
      '<div class="item"><div>' + escapeHtml(n.body) + '</div><div class="muted">' + escapeHtml(n.author_name || "-") + ' · ' + fmt(n.created_at) + '</div></div>'
    ).join("") : '<p class="muted">Izoh yo’q</p>';
    return h;
  }
  // A "Ko'rish ▾" button + an inline detail div that opens IN PLACE.
  function makeViewToggle(userId) {
    const detail = el("div", "detail"); detail.style.display = "none";
    let open = false;
    const b = btn("Ko‘rish ▾", "ghost mini", async () => {
      open = !open;
      if (open) { detail.style.display = "block"; b.textContent = "Yopish ▴"; detail.innerHTML = '<p class="muted">Yuklanmoqda…</p>'; await refreshMemberDetail(detail, userId); }
      else { detail.style.display = "none"; detail.innerHTML = ""; b.textContent = "Ko‘rish ▾"; }
    });
    return { button: b, detail };
  }
  // (Re)load a member's detail into its accordion, read-only info + live actions.
  async function refreshMemberDetail(detail, userId) {
    const r = await api("member_detail", { user_id: userId });
    detail.innerHTML = memberDetailHtml(r.data);
    detail.appendChild(memberActions(userId, r.data, detail));
  }
  // Inline actions inside a member's accordion: extend · freeze/unfreeze · note.
  function memberActions(userId, d, detail) {
    const wrap = el("div", "detail");
    const frozen = !!(d.membership && d.membership.status === "frozen");
    const hasM = !!d.membership;

    // Extend by N days
    wrap.appendChild(el("label", null, "Muddatni uzaytirish (kun)"));
    const exRow = el("div", "row");
    const exInput = el("input"); exInput.type = "number"; exInput.min = "1"; exInput.max = "365";
    exInput.placeholder = "masalan 7"; exInput.setAttribute("inputmode", "numeric");
    const exBtn = btn("Uzaytirish", "mini", async () => {
      const days = parseInt(exInput.value, 10);
      if (!days || days < 1) { toast("Kun kiriting"); return; }
      if (!confirm("Muddat " + days + " kunga uzaytirilsinmi?")) return;
      exBtn.disabled = true;
      const rr = await api("membership_extend", { user_id: userId, days });
      exBtn.disabled = false;
      if (rr.data && rr.data.ok) { exInput.value = ""; await refreshMemberDetail(detail, userId); }
      else toast((rr.data && rr.data.error) || "Xato");
    });
    exBtn.style.flex = "0 0 120px";
    exRow.appendChild(exInput); exRow.appendChild(exBtn);
    wrap.appendChild(exRow);

    // Freeze / Unfreeze
    if (hasM) {
      const fBtn = btn(frozen ? "Muzlatishdan chiqarish" : "Muzlatish", "ghost mini", async () => {
        if (!confirm(frozen ? "Muzlatishdan chiqarilsinmi?" : "A'zolik muzlatilsinmi?")) return;
        fBtn.disabled = true;
        const rr = await api(frozen ? "unfreeze" : "freeze", { user_id: userId });
        fBtn.disabled = false;
        if (rr.data && rr.data.ok) await refreshMemberDetail(detail, userId);
        else toast((rr.data && rr.data.error) || "Xato");
      });
      fBtn.style.marginTop = "10px";
      wrap.appendChild(fBtn);
    }

    // Assign trainer (dropdown of active trainers; empty = unassign)
    wrap.appendChild(el("label", null, "Trener biriktirish"));
    const tRow = el("div", "row");
    const tSel = el("select");
    const optNone = el("option", null, "— trener yo'q —"); optNone.value = ""; tSel.appendChild(optNone);
    (async () => {
      if (!trainersCache) { try { await fetchTrainers(); } catch (e) {} }
      activeTrainers().forEach((t) => { const o = el("option", null, t.name); o.value = t.id; tSel.appendChild(o); });
      if (d.trainer && d.trainer.id) tSel.value = d.trainer.id;
    })();
    const tBtn = btn("Biriktirish", "mini", async () => {
      tBtn.disabled = true;
      const rr = await api("member_assign_trainer", { user_id: userId, trainer_id: tSel.value });
      tBtn.disabled = false;
      if (rr.data && rr.data.ok) await refreshMemberDetail(detail, userId);
      else toast((rr.data && rr.data.error) || "Xato");
    });
    tBtn.style.flex = "0 0 120px";
    tRow.appendChild(tSel); tRow.appendChild(tBtn);
    wrap.appendChild(tRow);

    // Add internal note
    wrap.appendChild(el("label", null, "Ichki izoh qo‘shish"));
    const nInput = el("textarea"); nInput.placeholder = "Izoh (faqat xodimlar ko‘radi)"; nInput.rows = 2;
    const nBtn = btn("Izoh qo‘shish", "mini", async () => {
      const t = nInput.value.trim(); if (!t) return;
      nBtn.disabled = true;
      const rr = await api("member_note_add", { user_id: userId, body: t });
      nBtn.disabled = false;
      if (rr.data && rr.data.ok) { nInput.value = ""; await refreshMemberDetail(detail, userId); }
      else toast((rr.data && rr.data.error) || "Xato");
    });
    nBtn.style.marginTop = "8px";
    wrap.appendChild(nInput); wrap.appendChild(nBtn);
    return wrap;
  }

  // ── Members list (paginated + filtered) ─────────────────────────────────
  const PAGE = 25;
  const membersState = { status: "all", plan_id: "", q: "", sort: "asc", offset: 0, total: 0, loading: false };
  let plansCache = [];
  const MEMBER_FILTERS = [["all", "Hammasi"], ["active", "Faol"], ["expiring", "Tugayapti"], ["frozen", "Muzlatilgan"], ["expired", "Tugagan"], ["pending", "Kutilmoqda"]];
  const STATUS_BADGE = { active: "ok", expiring: "soon", frozen: "warn", expired: "bad", pending: "info" };
  const STATUS_LABEL = { active: "FAOL", expiring: "TUGAYAPTI", frozen: "MUZLATILGAN", expired: "TUGAGAN", pending: "KUTILMOQDA" };

  function renderFilters() {
    const box = $("mFilters"); box.innerHTML = "";
    MEMBER_FILTERS.forEach(([val, label]) => {
      const c = el("button", "chip" + (membersState.status === val ? " on" : ""), label);
      c.onclick = () => { membersState.status = val; renderFilters(); applyMemberFilter(); };
      box.appendChild(c);
    });
  }
  async function loadMemberPlans() {
    if (plansCache.length) return;
    const r = await api("plans");
    plansCache = (r.data && r.data.plans) || [];
    const sel = $("mPlan");
    plansCache.forEach((p) => { const o = el("option", null, p.name_uz); o.value = p.id; sel.appendChild(o); });
  }
  function applyMemberFilter() {
    membersState.q = $("mq").value.trim();
    membersState.plan_id = $("mPlan").value;
    membersState.sort = $("mSort").value;
    loadMembers(false);
  }
  async function loadMembers(append) {
    if (membersState.loading) return;
    membersState.loading = true;
    if (!append) { membersState.offset = 0; skeleton($("membersList"), 6); }
    const r = await api("members_list", {
      status: membersState.status, plan_id: membersState.plan_id, q: membersState.q,
      sort: membersState.sort, limit: PAGE, offset: membersState.offset,
    });
    membersState.loading = false;
    if (failed(r)) { if (!append) errorState($("membersList"), () => loadMembers(false)); return; }
    const d = r.data || {};
    membersState.total = d.total || 0;
    renderMembersList(d.members || [], append);
    membersState.offset += (d.members || []).length;
    $("mCount").textContent = membersState.total ? ("Jami: " + membersState.total) : "";
    $("mMore").classList.toggle("hidden", membersState.offset >= membersState.total);
  }
  function renderMembersList(members, append) {
    const box = $("membersList");
    let card = append ? box.querySelector(".card") : null;
    if (!card) {
      box.innerHTML = "";
      if (members.length === 0) { emptyState(box, "A'zo topilmadi.", "users"); return; }
      card = el("div", "card"); box.appendChild(card);
    }
    members.forEach((m) => card.appendChild(memberItem(m)));
  }
  function memberItem(m) {
    const it = el("div", "item");
    const top = el("div", "between");
    const left = el("div");
    left.innerHTML = '<div style="font-weight:700">' + escapeHtml(m.name || "(ismsiz) " + m.user_id.slice(0, 8)) + '</div>'
      + '<div class="muted">' + escapeHtml(m.plan_name || "—") + (m.end_date ? ' · ' + fmt(m.end_date) : '') + '</div>';
    const right = el("div"); right.style.display = "flex"; right.style.gap = "8px"; right.style.alignItems = "center";
    right.appendChild(el("span", "badge " + (STATUS_BADGE[m.status] || "info"), STATUS_LABEL[m.status] || m.status));
    const vt = makeViewToggle(m.user_id);
    right.appendChild(vt.button);
    top.appendChild(left); top.appendChild(right);
    it.appendChild(top); it.appendChild(vt.detail);
    return it;
  }
  const csvCell = (v) => { const s = String(v == null ? "" : v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  async function exportMembersCsv() {
    const r = await api("members_list", { status: membersState.status, plan_id: membersState.plan_id, q: membersState.q, sort: membersState.sort, limit: 10000, offset: 0 });
    const list = (r.data && r.data.members) || [];
    if (!list.length) { toast("Eksport uchun a’zo yo‘q"); return; }
    const head = ["Ism", "Holat", "Tarif", "Tugaydi", "ID"];
    const rows = list.map((m) => [m.name || "", STATUS_LABEL[m.status] || m.status, m.plan_name || "", m.end_date || "", m.user_id]);
    const csv = [head, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "nerofit-azolar-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  async function loadFeed() {
    const box = $("feed"); skeleton(box, 4);
    const r = await api("checkins_recent");
    if (failed(r)) { errorState(box, loadFeed); return; }
    const list = (r.data && r.data.checkins) || [];
    box.innerHTML = "";
    if (list.length === 0) { emptyState(box, "Hali kelishlar yo'q.", "door"); return; }
    const c = el("div", "card");
    list.forEach((k) => {
      const it = el("div", "item");
      const b = el("div", "between");
      const info = el("div");
      info.innerHTML = '<div>' + escapeHtml(k.member_name || "(ismsiz)") + '</div><div class="muted">' + fmt(k.checked_at) + ' · ' + escapeHtml(k.staff_name || "-") + '</div>';
      const right = el("div"); right.style.display = "flex"; right.style.gap = "8px"; right.style.alignItems = "center";
      const vt = makeViewToggle(k.user_id);
      right.appendChild(vt.button);
      right.appendChild(el("span", "badge " + (k.was_active ? "ok" : "bad"), k.was_active ? "FAOL" : "EMAS"));
      b.appendChild(info); b.appendChild(right);
      it.appendChild(b); it.appendChild(vt.detail);
      c.appendChild(it);
    });
    box.appendChild(c);
  }

  // ── Finance: journal · cash · revenue ──────────────────────────────────
  const PROV_FILTERS = [["all", "Hammasi"], ["manual", "Naqd"], ["payme", "Payme"], ["click", "Click"]];
  const PAY_STAT_FILTERS = [["all", "Hammasi"], ["paid", "To‘langan"], ["created", "Yaratilgan"], ["cancelled", "Bekor"]];
  const PROV_LABEL = { manual: "Naqd", payme: "Payme", click: "Click" };
  const PAY_BADGE = { paid: "ok", created: "info", cancelled: "bad" };
  const PAY_LABEL = { paid: "TO‘LANGAN", created: "YARATILGAN", cancelled: "BEKOR" };
  const payState = { provider: "all", status: "all", from: "", to: "", q: "", offset: 0, total: 0, loading: false };
  let financeInit = false;

  function initFinance() {
    if (!financeInit) {
      renderPayFilters();
      const today = new Date().toISOString().slice(0, 10);
      $("cashDate").value = today;
      $("revTo").value = today;
      $("revFrom").value = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      financeInit = true;
    }
    showFinance("journal");
  }
  function showFinance(sub) {
    ["journal", "cash", "revenue"].forEach((s) => {
      $("fsec-" + s).classList.toggle("hidden", s !== sub);
      $("ftab-" + s).className = s === sub ? "on" : "off";
    });
    if (sub === "journal") loadPayments(false);
    if (sub === "cash") loadCash();
    if (sub === "revenue") loadRevenue();
  }
  function renderPayFilters() {
    const pb = $("fProvFilters"); pb.innerHTML = "";
    PROV_FILTERS.forEach(([v, l]) => { const c = el("button", "chip" + (payState.provider === v ? " on" : ""), l); c.onclick = () => { payState.provider = v; renderPayFilters(); applyPayFilter(); }; pb.appendChild(c); });
    const sb = $("fStatFilters"); sb.innerHTML = "";
    PAY_STAT_FILTERS.forEach(([v, l]) => { const c = el("button", "chip" + (payState.status === v ? " on" : ""), l); c.onclick = () => { payState.status = v; renderPayFilters(); applyPayFilter(); }; sb.appendChild(c); });
  }
  function applyPayFilter() {
    payState.from = $("fFrom").value;
    payState.to = $("fTo").value;
    payState.q = $("fq").value.trim();
    loadPayments(false);
  }
  async function loadPayments(append) {
    if (payState.loading) return;
    payState.loading = true;
    if (!append) { payState.offset = 0; skeleton($("paymentsList"), 6); }
    const r = await api("payments_list", { provider: payState.provider, status: payState.status, from: payState.from, to: payState.to, q: payState.q, limit: PAGE, offset: payState.offset });
    payState.loading = false;
    if (failed(r)) { if (!append) errorState($("paymentsList"), () => loadPayments(false)); return; }
    const d = r.data || {};
    payState.total = d.total || 0;
    renderPaymentsList(d.payments || [], append);
    payState.offset += (d.payments || []).length;
    $("fSum").textContent = d.total ? ("Jami: " + d.total + " ta · " + uzs(d.sum_uzs || 0) + " so‘m") : "";
    $("fMore").classList.toggle("hidden", payState.offset >= payState.total);
  }
  function renderPaymentsList(payments, append) {
    const box = $("paymentsList");
    let card = append ? box.querySelector(".card") : null;
    if (!card) {
      box.innerHTML = "";
      if (payments.length === 0) { emptyState(box, "To'lov topilmadi.", "cash"); return; }
      card = el("div", "card"); box.appendChild(card);
    }
    payments.forEach((p) => card.appendChild(paymentItem(p)));
  }
  function paymentItem(p) {
    const it = el("div", "item");
    const top = el("div", "between");
    const left = el("div");
    left.innerHTML = '<div style="font-weight:700">' + uzs(p.amount_uzs) + ' so‘m <span class="muted">· ' + escapeHtml(PROV_LABEL[p.provider] || p.provider) + '</span></div>'
      + '<div class="muted">' + escapeHtml(p.member_name || "(ismsiz)") + ' · ' + fmt(p.paid_at || p.created_at) + (p.staff_name ? ' · ' + escapeHtml(p.staff_name) : '') + '</div>';
    const right = el("div"); right.style.flexShrink = "0";
    right.appendChild(el("span", "badge " + (PAY_BADGE[p.status] || "info"), PAY_LABEL[p.status] || p.status));
    top.appendChild(left); top.appendChild(right);
    it.appendChild(top);
    if (p.status === "paid") {
      const rb = btn("Qaytarish", "danger mini", () => refundPayment(p.id, p.amount_uzs));
      rb.style.marginTop = "8px";
      it.appendChild(rb);
    }
    return it;
  }
  async function refundPayment(id, amount) {
    if (!confirm("To‘lov (" + uzs(amount) + " so‘m) qaytarilsinmi? Bog‘langan a'zolik bekor qilinishi mumkin.")) return;
    if (!confirm("Aniqmi? Bu amalni orqaga qaytarib bo‘lmaydi.")) return;
    const r = await api("payment_refund", { payment_id: id });
    if (r.data && r.data.ok) { toast("Qaytarildi" + (r.data.membership_cancelled ? " · a'zolik bekor qilindi" : ""), "ok"); loadPayments(false); }
    else toast((r.data && r.data.error) || "Xato");
  }
  async function loadCash() {
    const date = $("cashDate").value || new Date().toISOString().slice(0, 10);
    const box = $("cashReport"); box.innerHTML = '<p class="muted">Yuklanmoqda…</p>';
    const r = await api("cash_report", { date });
    if (failed(r)) { errorState(box, loadCash); return; }
    const d = r.data || {};
    box.innerHTML = "";
    const head = el("div", "card");
    head.innerHTML = '<div class="muted">Jami naqd</div><div class="big" style="margin:4px 0 0">' + uzs(d.total_uzs || 0) + ' so‘m</div><div class="muted">' + (d.total_count || 0) + ' ta to‘lov</div>';
    box.appendChild(head);
    if (!d.staff || !d.staff.length) { box.appendChild(el("p", "muted", "Bu kunda naqd yo‘q.")); return; }
    const t = el("div", "card");
    d.staff.forEach((s) => {
      const it = el("div", "item");
      it.innerHTML = '<div class="between"><span>' + escapeHtml(s.staff_name) + '</span><span style="font-weight:700">' + uzs(s.sum_uzs) + ' so‘m</span></div><div class="muted">' + s.count + ' ta</div>';
      t.appendChild(it);
    });
    box.appendChild(t);
  }
  async function loadRevenue() {
    const from = $("revFrom").value, to = $("revTo").value;
    const box = $("revReport"); box.innerHTML = '<p class="muted">Hisoblanmoqda…</p>';
    const extra = {}; if (from) extra.from = from; if (to) extra.to = to;
    const r = await api("revenue_report", extra);
    if (failed(r)) { errorState(box, loadRevenue); return; }
    const d = r.data || {};
    box.innerHTML = "";
    const head = el("div", "card");
    head.innerHTML = '<div class="muted">' + fmt(d.from) + ' — ' + fmt(d.to) + '</div><div class="big" style="margin:6px 0 0">' + uzs(d.total_uzs || 0) + ' so‘m</div><div class="muted">' + (d.total_count || 0) + ' ta to‘lov</div>';
    box.appendChild(head);
    box.appendChild(groupCard("Provider bo‘yicha", d.by_provider, (k) => PROV_LABEL[k] || k));
    box.appendChild(groupCard("Tarif bo‘yicha", d.by_plan, null));
  }
  function groupCard(title, rows, labelFn) {
    const wrap = el("div");
    wrap.appendChild(el("h2", null, title));
    const c = el("div", "card");
    if (!rows || !rows.length) { c.innerHTML = '<p class="muted">Yo‘q</p>'; }
    else rows.forEach((row) => {
      const it = el("div", "item");
      const label = labelFn ? labelFn(row.label) : row.label;
      it.innerHTML = '<div class="between"><span>' + escapeHtml(label) + '</span><span style="font-weight:700">' + uzs(row.sum_uzs) + ' so‘m</span></div><div class="muted">' + row.count + ' ta</div>';
      c.appendChild(it);
    });
    wrap.appendChild(c);
    return wrap;
  }

  // ── Plans (tariffs) management ──────────────────────────────────────────
  const expandedPlans = new Set();
  async function loadPlansAdmin() {
    const box = $("plansList"); skeleton(box, 3);
    const r = await api("plan_list_all");
    if (failed(r)) { errorState(box, loadPlansAdmin); return; }
    const plans = (r.data && r.data.plans) || [];
    box.innerHTML = "";
    if (plans.length === 0) { emptyState(box, "Hali tarif yo'q.", "inbox"); return; }
    plans.forEach((p) => box.appendChild(planItem(p)));
  }
  function planItem(p) {
    const c = el("div", "card");
    const top = el("div", "between");
    const left = el("div");
    left.innerHTML = '<div style="font-weight:700">' + escapeHtml(p.name_uz) + ' <span class="muted">· ' + p.duration_days + ' kun</span></div>'
      + '<div class="muted">App: ' + uzs(p.price_app_uzs) + ' · Zal: ' + uzs(p.price_gym_uzs) + ' so\'m · tartib ' + p.sort_order + '</div>';
    top.appendChild(left);
    top.appendChild(el("span", "badge " + (p.is_active ? "ok" : "bad"), p.is_active ? "FAOL" : "NOFAOL"));
    c.appendChild(top);

    // Inline edit form, revealed by "Tahrirlash" (kept open across reloads).
    const form = el("div"); form.style.marginTop = "10px";
    form.style.display = expandedPlans.has(p.id) ? "block" : "none";
    const mk = (labelTxt, val, type) => {
      form.appendChild(el("label", null, labelTxt));
      const inp = el("input"); if (type) { inp.type = type; inp.setAttribute("inputmode", "numeric"); }
      inp.value = val == null ? "" : String(val);
      form.appendChild(inp); return inp;
    };
    const iName = mk("Nom", p.name_uz);
    const iDays = mk("Davomiylik (kun)", p.duration_days, "number");
    const iApp = mk("App narxi (so'm)", p.price_app_uzs, "number");
    const iGym = mk("Zal narxi (so'm)", p.price_gym_uzs, "number");
    const iSort = mk("Tartib", p.sort_order, "number");
    const msg = el("p", "muted");
    const row = el("div", "row"); row.style.marginTop = "8px";
    const save = btn("Saqlash", "mini", async () => {
      const r = await api("plan_update", { plan_id: p.id, name_uz: iName.value, duration_days: iDays.value, price_app_uzs: iApp.value, price_gym_uzs: iGym.value, sort_order: iSort.value });
      if (r.data && r.data.ok) { msg.textContent = "Saqlandi ✓"; loadPlansAdmin(); }
      else { msg.textContent = (r.data && r.data.error) || "Xato"; }
    });
    const toggle = btn(p.is_active ? "Nofaol qilish" : "Faollashtirish", "ghost mini", async () => {
      const r = await api("plan_set_active", { plan_id: p.id, is_active: !p.is_active });
      if (r.data && r.data.ok) loadPlansAdmin(); else toast((r.data && r.data.error) || "Xato");
    });
    row.appendChild(save); row.appendChild(toggle);
    form.appendChild(row); form.appendChild(msg);

    const edit = btn(expandedPlans.has(p.id) ? "Yopish" : "Tahrirlash", "ghost mini", () => {
      if (expandedPlans.has(p.id)) { expandedPlans.delete(p.id); form.style.display = "none"; edit.textContent = "Tahrirlash"; }
      else { expandedPlans.add(p.id); form.style.display = "block"; edit.textContent = "Yopish"; }
    });
    edit.style.marginTop = "10px";
    c.appendChild(edit); c.appendChild(form);
    return c;
  }
  async function addPlan() {
    const r = await api("plan_create", {
      name_uz: $("np-name").value,
      duration_days: $("np-days").value,
      price_app_uzs: $("np-app").value,
      price_gym_uzs: $("np-gym").value,
      sort_order: $("np-sort").value || 0,
    });
    if (r.data && r.data.ok) {
      ["np-name", "np-days", "np-app", "np-gym", "np-sort"].forEach((id) => { $(id).value = ""; });
      $("np-msg").textContent = "Qo'shildi ✓"; loadPlansAdmin();
    } else { $("np-msg").textContent = (r.data && r.data.error) || "Xato"; }
  }

  // ── Content: exercise library + videos ──────────────────────────────────
  const expandedEx = new Set();
  async function loadContent() {
    const box = $("exerciseList"); skeleton(box, 4);
    const r = await api("exercise_list");
    if (failed(r)) { errorState(box, loadContent); return; }
    const list = (r.data && r.data.exercises) || [];
    box.innerHTML = "";
    if (list.length === 0) { emptyState(box, "Hali mashq yo'q.", "inbox"); return; }
    list.forEach((e) => box.appendChild(exerciseItem(e)));
  }
  function exerciseItem(e) {
    const vids = e.exercise_videos || [];
    const c = el("div", "card");
    const top = el("div");
    const muscles = (e.target_muscles || []).join(", ");
    top.innerHTML = '<div style="font-weight:700">' + escapeHtml(e.title) + '</div>'
      + '<div class="muted">' + (muscles ? escapeHtml(muscles) + ' · ' : '') + e.default_sets + '×' + e.default_reps + ' · ' + vids.length + ' video</div>';
    c.appendChild(top);

    const form = el("div"); form.style.marginTop = "10px";
    form.style.display = expandedEx.has(e.id) ? "block" : "none";
    const mk = (labelTxt, val, type) => {
      form.appendChild(el("label", null, labelTxt));
      const inp = el("input"); if (type) { inp.type = type; inp.setAttribute("inputmode", "numeric"); }
      inp.value = val == null ? "" : String(val); form.appendChild(inp); return inp;
    };
    const iTitle = mk("Nom", e.title);
    const iMus = mk("Mushaklar (vergul bilan)", (e.target_muscles || []).join(", "));
    const iSets = mk("Set", e.default_sets, "number");
    const iReps = mk("Takror", e.default_reps, "number");
    const iImg = mk("Rasm havolasi", e.image_url);
    const emsg = el("p", "muted");
    const saveRow = el("div", "row"); saveRow.style.marginTop = "8px";
    const save = btn("Saqlash", "mini", async () => {
      const r = await api("exercise_update", { exercise_id: e.id, title: iTitle.value, target_muscles: iMus.value, default_sets: iSets.value, default_reps: iReps.value, image_url: iImg.value });
      if (r.data && r.data.ok) { emsg.textContent = "Saqlandi ✓"; loadContent(); } else { emsg.textContent = (r.data && r.data.error) || "Xato"; }
    });
    const del = btn("O'chirish", "danger mini", async () => {
      if (!confirm("'" + e.title + "' o'chirilsinmi?")) return;
      const r = await api("exercise_delete", { exercise_id: e.id });
      if (r.data && r.data.ok) { expandedEx.delete(e.id); loadContent(); } else { toast((r.data && r.data.error) || "Xato"); }
    });
    saveRow.appendChild(save); saveRow.appendChild(del);
    form.appendChild(saveRow); form.appendChild(emsg);

    // Videos list + add
    form.appendChild(el("label", null, "Videolar"));
    if (vids.length) {
      vids.forEach((v) => {
        const it = el("div", "item");
        const b = el("div", "between");
        const link = el("div"); link.style.overflow = "hidden"; link.style.textOverflow = "ellipsis"; link.style.whiteSpace = "nowrap"; link.style.flex = "1";
        link.innerHTML = '<span class="muted">' + escapeHtml(v.url) + (v.duration_sec ? ' · ' + v.duration_sec + 's' : '') + '</span>';
        const rm = btn("O'chir", "danger mini", async () => {
          const r = await api("exercise_video_delete", { video_id: v.id });
          if (r.data && r.data.ok) loadContent(); else toast((r.data && r.data.error) || "Xato");
        });
        b.appendChild(link); b.appendChild(rm);
        it.appendChild(b); form.appendChild(it);
      });
    } else { form.appendChild(el("p", "muted", "Video yo'q")); }
    const vUrl = el("input"); vUrl.placeholder = "Video havolasi https://..."; vUrl.style.marginTop = "8px"; vUrl.setAttribute("autocomplete", "off");
    const vRow = el("div", "row");
    const vDur = el("input"); vDur.type = "number"; vDur.setAttribute("inputmode", "numeric"); vDur.placeholder = "sek (ixtiyoriy)";
    const vAdd = btn("Video qo'shish", "mini", async () => {
      const r = await api("exercise_video_add", { exercise_id: e.id, url: vUrl.value, duration_sec: vDur.value });
      if (r.data && r.data.ok) { vUrl.value = ""; vDur.value = ""; loadContent(); } else { toast((r.data && r.data.error) || "Xato"); }
    });
    vRow.appendChild(vDur); vRow.appendChild(vAdd);
    form.appendChild(vUrl); form.appendChild(vRow);

    const edit = btn(expandedEx.has(e.id) ? "Yopish" : "Tahrirlash", "ghost mini", () => {
      if (expandedEx.has(e.id)) { expandedEx.delete(e.id); form.style.display = "none"; edit.textContent = "Tahrirlash"; }
      else { expandedEx.add(e.id); form.style.display = "block"; edit.textContent = "Yopish"; }
    });
    edit.style.marginTop = "10px";
    c.appendChild(edit); c.appendChild(form);
    return c;
  }
  async function addExercise() {
    const r = await api("exercise_create", {
      title: $("ne-title").value,
      target_muscles: $("ne-muscles").value,
      default_sets: $("ne-sets").value || 3,
      default_reps: $("ne-reps").value || 10,
      image_url: $("ne-img").value,
    });
    if (r.data && r.data.ok) {
      ["ne-title", "ne-muscles", "ne-sets", "ne-reps", "ne-img"].forEach((id) => { $(id).value = ""; });
      $("ne-msg").textContent = "Qo'shildi ✓"; loadContent();
    } else { $("ne-msg").textContent = (r.data && r.data.error) || "Xato"; }
  }

  // ── Trainers ─────────────────────────────────────────────────────────────
  let trainersCache = null; // full list from trainer_list (incl. inactive)
  const expandedTrainers = new Set();
  async function fetchTrainers() {
    const r = await api("trainer_list");
    trainersCache = (r.data && r.data.trainers) || [];
    return trainersCache;
  }
  const activeTrainers = () => (trainersCache || []).filter((t) => t.is_active);
  async function loadTrainers() {
    const box = $("trainerList"); skeleton(box, 3);
    const r = await api("trainer_list");
    if (failed(r)) { errorState(box, loadTrainers); return; }
    trainersCache = (r.data && r.data.trainers) || [];
    box.innerHTML = "";
    if (!trainersCache.length) { emptyState(box, "Hali trener yo'q.", "users"); return; }
    trainersCache.forEach((t) => box.appendChild(trainerItem(t)));
  }
  function trainerItem(t) {
    const c = el("div", "card");
    const top = el("div", "between");
    const left = el("div");
    left.innerHTML = '<div style="font-weight:700">' + escapeHtml(t.name) + (t.specialization ? ' <span class="muted">· ' + escapeHtml(t.specialization) + '</span>' : '') + '</div>'
      + '<div class="muted">' + t.member_count + ' a\'zo' + (t.bio ? ' · ' + escapeHtml(t.bio) : '') + '</div>';
    top.appendChild(left);
    top.appendChild(el("span", "badge " + (t.is_active ? "ok" : "bad"), t.is_active ? "FAOL" : "NOFAOL"));
    c.appendChild(top);

    const form = el("div"); form.style.marginTop = "10px"; form.style.display = expandedTrainers.has(t.id) ? "block" : "none";
    const mk = (labelTxt, val, ta) => {
      form.appendChild(el("label", null, labelTxt));
      const inp = el(ta ? "textarea" : "input"); if (ta) inp.rows = 2;
      inp.value = val == null ? "" : String(val); form.appendChild(inp); return inp;
    };
    const iName = mk("Ism", t.name);
    const iSpec = mk("Mutaxassislik", t.specialization);
    const iBio = mk("Bio", t.bio, true);
    const iPhoto = mk("Rasm havolasi", t.photo_url);
    const msg = el("p", "muted");
    const row = el("div", "row"); row.style.marginTop = "8px";
    const save = btn("Saqlash", "mini", async () => {
      const r = await api("trainer_update", { trainer_id: t.id, name: iName.value, specialization: iSpec.value, bio: iBio.value, photo_url: iPhoto.value });
      if (r.data && r.data.ok) { msg.textContent = "Saqlandi ✓"; loadTrainers(); } else { msg.textContent = (r.data && r.data.error) || "Xato"; }
    });
    const toggle = btn(t.is_active ? "Nofaol qilish" : "Faollashtirish", "ghost mini", async () => {
      const r = await api("trainer_set_active", { trainer_id: t.id, is_active: !t.is_active });
      if (r.data && r.data.ok) loadTrainers(); else toast((r.data && r.data.error) || "Xato");
    });
    row.appendChild(save); row.appendChild(toggle);
    form.appendChild(row); form.appendChild(msg);

    const edit = btn(expandedTrainers.has(t.id) ? "Yopish" : "Tahrirlash", "ghost mini", () => {
      if (expandedTrainers.has(t.id)) { expandedTrainers.delete(t.id); form.style.display = "none"; edit.textContent = "Tahrirlash"; }
      else { expandedTrainers.add(t.id); form.style.display = "block"; edit.textContent = "Yopish"; }
    });
    edit.style.marginTop = "10px";
    c.appendChild(edit); c.appendChild(form);
    return c;
  }
  async function addTrainer() {
    const r = await api("trainer_create", { name: $("nt-name").value, specialization: $("nt-spec").value, bio: $("nt-bio").value, photo_url: $("nt-photo").value });
    if (r.data && r.data.ok) {
      ["nt-name", "nt-spec", "nt-bio", "nt-photo"].forEach((id) => { $(id).value = ""; });
      $("nt-msg").textContent = "Qo'shildi ✓"; trainersCache = null; loadTrainers();
    } else { $("nt-msg").textContent = (r.data && r.data.error) || "Xato"; }
  }

  // Restore the session token remembered on this device (verify it's still valid).
  (function () {
    let saved = ""; try { saved = localStorage.getItem("na_token") || ""; } catch (e) {}
    if (!saved) return;
    setToken(saved);
    api("session").then((r) => {
      if (r.status === 200 && (r.data.role === "admin" || r.data.role === "owner")) {
        $("login").classList.add("hidden"); $("dash").classList.remove("hidden"); show("dash");
      } else { setToken(""); try { localStorage.removeItem("na_token"); } catch (e) {} }
    });
  })();

  // Mobile topbar: hide on scroll-down, reveal on scroll-up — frees screen on a
  // phone while keeping nav one swipe-up away. Desktop uses the sticky sidebar,
  // so the topbar is display:none there and this is a no-op. rAF-throttled.
  (function () {
    const tb = document.querySelector(".topbar");
    if (!tb) return;
    let lastY = window.scrollY || 0, ticking = false;
    function onScroll() {
      ticking = false;
      const y = window.scrollY || 0;
      if (getComputedStyle(tb).display === "none") { lastY = y; return; } // desktop: skip
      if (y > lastY + 6 && y > 64) tb.classList.add("tb-hidden");         // down → hide
      else if (y < lastY - 6) tb.classList.remove("tb-hidden");           // up → reveal
      lastY = y;
    }
    addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
  })();

  // Quick-add (Issue 4): "+" FAB → bottom sheet with create shortcuts. Each
  // shortcut jumps to that tab and focuses its create form's first field.
  function openQuickAdd() {
    $("quickBackdrop").classList.add("show");
    $("quickSheet").classList.add("open");
  }
  function closeQuickAdd() {
    $("quickBackdrop").classList.remove("show");
    $("quickSheet").classList.remove("open");
  }
  const QUICK_FOCUS = { plans: "np-name", trainers: "nt-name", content: "ne-title", staff: "ns-name" };
  function quickCreate(tab) {
    closeQuickAdd();
    show(tab);
    const inp = $(QUICK_FOCUS[tab]);
    if (inp) { try { inp.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {} inp.focus(); }
  }
  // Esc closes the sheet.
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeQuickAdd(); });

  // ── Event delegation (Issue 4b): one listener each for click/change/Enter,
  // replacing ~40 inline on* attributes. Dynamic list buttons keep their own
  // JS onclick (via btn()), so only the static markup is data-* driven.
  const ACTIONS = {
    login, logout, toggleSidebar, closeSidebar, changeAdminPw,
    addStaff, addPlan, addExercise, addTrainer, exportMembersCsv,
    applyMemberFilter, applyPayFilter,
    loadDash, loadFeed, loadContent, loadTrainers, loadAudit, loadCash, loadRevenue,
    openQuickAdd, closeQuickAdd,
    show: (a) => show(a),
    showFinance: (a) => showFinance(a),
    quickCreate: (a) => quickCreate(a),
    membersMore: () => loadMembers(true),
    paymentsMore: () => loadPayments(true),
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action]"); if (!t) return;
    const fn = ACTIONS[t.getAttribute("data-action")];
    if (fn) fn(t.getAttribute("data-arg"));
  });
  document.addEventListener("change", (e) => {
    const t = e.target.closest("[data-change]"); if (!t) return;
    const fn = ACTIONS[t.getAttribute("data-change")]; if (fn) fn();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const t = e.target.closest("[data-enter]"); if (!t) return;
    const fn = ACTIONS[t.getAttribute("data-enter")]; if (fn) fn();
  });
