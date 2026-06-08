import { supabase } from "@/lib/supabase";
import type { ChatEmbed, ChatMessage } from "@/types/db";

export async function getOrCreateThread(userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("chat_threads")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error || !created) throw error ?? new Error("Failed to create thread");
  return created.id;
}

export async function getMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function sendChatMessage(
  threadId: string,
  message: string,
): Promise<{ reply: string; embed?: ChatEmbed }> {
  // Pull a fresh session and pass the user's JWT explicitly. On web,
  // functions.invoke does not always attach the access token, which makes the
  // Edge Function see only the anon key and reject the request with 401.
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated — please log in again.");

  const { data, error } = await supabase.functions.invoke("ai-coach", {
    body: { thread_id: threadId, message },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    // FunctionsHttpError hides the real reason in `context` (the Response).
    // Pull the status + body out so we can see what actually failed.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.text === "function") {
      const body = await ctx.text().catch(() => "");
      throw new Error(`HTTP ${ctx.status}: ${body || error.message}`);
    }
    throw error;
  }
  return data as { reply: string; embed?: ChatEmbed };
}
