// CORS + JSON response helpers. No wildcard ACAO (S1): the trusted origin is
// reflected per-request in index.ts's Deno.serve; here we only carry the shared
// method/header allow-list plus the JSON body helper used by every handler.
export const cors = {
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Reflect the request Origin only if it's a panel we trust (*.vercel.app + local).
// Tighten to exact prod aliases once confirmed (gym-admin / gym-panel URLs).
export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const ok = origin.endsWith(".vercel.app") ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");
  return ok ? origin : null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
