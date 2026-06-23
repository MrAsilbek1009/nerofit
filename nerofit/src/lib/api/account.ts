import { supabase } from "@/lib/supabase";

// Permanently delete the signed-in user's account and all their data.
// Calls the `delete-account` Edge Function, which uses the service-role key to
// remove the auth user; ON DELETE CASCADE wipes every user-owned row.
export async function deleteAccount(): Promise<void> {
  // Pass the JWT explicitly — functions.invoke does not reliably attach it on
  // web, which would make the function see only the anon key and 401.
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated — please log in again.");

  const { error } = await supabase.functions.invoke("delete-account", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.text === "function") {
      const body = await ctx.text().catch(() => "");
      throw new Error(`HTTP ${ctx.status}: ${body || error.message}`);
    }
    throw error;
  }
}
