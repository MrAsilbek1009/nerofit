// Admin API client (Issue 4b). Owns the session token and the single fetch
// wrapper every feature calls. Imports only $ (for the session-expired redirect),
// so it stays a thin leaf above ui.js.
import { $ } from "./ui.js";

export const API = "https://orhhiqdvukshlvtqorgp.functions.supabase.co/admin-verify";

let TOKEN = "";
export const getToken = () => TOKEN;
export function setToken(t) { TOKEN = t || ""; }

export async function api(action, extra) {
  let res, data = {};
  try {
    res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.assign({ action, token: TOKEN }, extra || {})),
    });
    try { data = await res.json(); } catch (e) {}
  } catch (e) {
    // Network failure (offline, DNS, CORS) — surface as an error, not empty data.
    return { status: 0, data: {}, error: true };
  }
  // Session expired mid-use -> drop back to login (avoid recursing via logout()).
  if (res.status === 401 && TOKEN && action !== "session") {
    TOKEN = ""; try { localStorage.removeItem("na_token"); } catch (e) {}
    $("dash").classList.add("hidden"); $("login").classList.remove("hidden");
    $("loginMsg").textContent = "Sessiya tugadi — qayta kiring.";
  }
  return { status: res.status, data, error: res.status >= 500 };
}

// True when a call failed at the transport/server level (vs. a valid empty result).
export const failed = (r) => !!(r && (r.error || r.status === 0 || r.status >= 500));
