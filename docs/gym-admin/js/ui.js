// UI/DOM leaf helpers (Issue 4b). No dependency on api.js or app state — safe to
// import anywhere. Extracted verbatim from the old inline script.
export const $ = (id) => document.getElementById(id);
export const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
export const btn = (text, cls, on) => { const b = document.createElement("button"); b.className = cls; b.textContent = text; b.onclick = on; return b; };
export const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// Non-blocking toast (D1). type: "err" (default) | "ok". Auto-dismisses.
export function toast(msg, type) {
  const box = $("toast"); if (!box) return;
  const t = el("div", "toast " + (type === "ok" ? "ok" : "err"), String(msg == null ? "" : msg));
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 200); }, 2600);
}

// Skeleton loader (D1): shimmer rows in a card while a list loads.
export function skeleton(box, rows) {
  box.innerHTML = "";
  const c = el("div", "card");
  for (let i = 0; i < (rows || 4); i++) {
    const s = el("div", "skel skel-row");
    s.style.width = (55 + Math.floor(Math.random() * 40)) + "%";
    c.appendChild(s);
  }
  box.appendChild(c);
}

// Icon glyphs (D3): small outline SVGs reused by states + KPI cards.
export const SVG = {
  inbox: '<svg viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  users: '<svg viewBox="0 0 24 24" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  clock: '<svg viewBox="0 0 24 24" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
  snow: '<svg viewBox="0 0 24 24" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>',
  door: '<svg viewBox="0 0 24 24" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  cash: '<svg viewBox="0 0 24 24" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  peak: '<svg viewBox="0 0 24 24" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>',
};

// Empty state (D3): centered icon + message; replaces bare "<p class=muted>".
export function emptyState(box, msg, icon) {
  box.innerHTML = '<div class="state">' + (SVG[icon] || SVG.inbox) + '<p>' + escapeHtml(msg) + '</p></div>';
}
// Error state (D3): honest failure + retry, so a dropped request never reads as "topilmadi".
export function errorState(box, retry) {
  box.innerHTML = "";
  const w = el("div", "state err");
  w.innerHTML = SVG.alert + '<p>Ulanishda xato yuz berdi.</p>';
  if (retry) w.appendChild(btn("Qayta urinish", "ghost mini", retry));
  box.appendChild(w);
}

// kun.oy.yil — date-only "2026-10-03" -> "03.10.2026"; datetime keeps HH:MM.
export function fmt(dt) {
  if (!dt) return "-";
  const s = String(dt);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const d = new Date(dt); if (isNaN(d)) return s;
  const p = (n) => String(n).padStart(2, "0");
  const date = dateOnly
    ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4)
    : p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear();
  return dateOnly ? date : date + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
export const uzs = (n) => (n || 0).toLocaleString("ru-RU");
