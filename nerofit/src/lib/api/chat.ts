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
  const { data, error } = await supabase.functions.invoke("ai-coach", {
    body: { thread_id: threadId, message },
  });

  if (error) throw error;
  return data as { reply: string; embed?: ChatEmbed };
}
