import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

// Parse params from BOTH the query (`?a=b`) and the fragment (`#a=b`) of a URL.
// Supabase's default (implicit) recovery link delivers the tokens in the
// fragment; PKCE delivers a `code`/`token_hash` in the query. We support both.
function parseAuthParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const collect = (str?: string) => {
    if (!str) return;
    for (const pair of str.split("&")) {
      const eq = pair.indexOf("=");
      if (eq < 0) continue;
      const key = decodeURIComponent(pair.slice(0, eq));
      const value = decodeURIComponent(pair.slice(eq + 1));
      if (key) out[key] = value;
    }
  };

  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  if (queryIndex >= 0) {
    collect(url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined));
  }
  if (hashIndex >= 0) collect(url.slice(hashIndex + 1));
  return out;
}

// Returns true when the URL was a recovery link we successfully turned into an
// active recovery session. The caller (auth gate) then keeps the user on the
// reset-password screen.
export async function handleRecoveryUrl(url: string | null): Promise<boolean> {
  if (!url) return false;
  const isRecoveryLink =
    url.includes("reset-password") || url.includes("type=recovery");
  if (!isRecoveryLink) return false;

  const params = parseAuthParams(url);

  // Implicit flow (Supabase default): access + refresh token in the fragment.
  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) return false;
    useAuthStore.getState().setPasswordRecovery(true);
    return true;
  }

  // PKCE / OTP fallback: a hashed token that we verify into a session.
  if (params.token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: params.token_hash,
    });
    if (error) return false;
    useAuthStore.getState().setPasswordRecovery(true);
    return true;
  }

  return false;
}

// Wire incoming deep links to the recovery handler. Call once from the root
// layout. Handles both cold start (getInitialURL) and warm links (event).
export function initRecoveryLinking(): () => void {
  void Linking.getInitialURL().then(handleRecoveryUrl);
  const sub = Linking.addEventListener("url", ({ url }) => {
    void handleRecoveryUrl(url);
  });
  return () => sub.remove();
}
