import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessages, getOrCreateThread, sendChatMessage } from "@/lib/api/chat";
import { track } from "@/lib/analytics";
import type { ChatEmbed, ChatMessage } from "@/types/db";
import { qk } from "./keys";

export function useThread(userId: string | null | undefined) {
  return useQuery({
    queryKey: qk.chatThread(userId ?? ""),
    queryFn: () => getOrCreateThread(userId!),
    enabled: !!userId,
    staleTime: Infinity,
  });
}

export function useChatMessages(threadId: string | null) {
  return useQuery({
    queryKey: qk.chatMessages(threadId ?? ""),
    queryFn: () => getMessages(threadId!),
    enabled: !!threadId,
    staleTime: 0,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      message,
    }: {
      threadId: string;
      message: string;
    }): Promise<{ reply: string; embed?: ChatEmbed }> => {
      return sendChatMessage(threadId, message);
    },
    onMutate: async ({ threadId, message }) => {
      const key = qk.chatMessages(threadId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ChatMessage[]>(key) ?? [];
      const optimistic: ChatMessage = {
        id: `opt-${Date.now()}`,
        thread_id: threadId,
        role: "user",
        content: message,
        embed: null,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<ChatMessage[]>(key, [...prev, optimistic]);
      return { prev, threadId };
    },
    onSuccess: (data, { threadId }) => {
      track("coach_message_sent", { has_embed: !!data.embed });
      const key = qk.chatMessages(threadId);
      const msgs = qc.getQueryData<ChatMessage[]>(key) ?? [];
      const withoutOpt = msgs.filter((m) => !m.id.startsWith("opt-"));
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        thread_id: threadId,
        role: "user",
        content: msgs.find((m) => m.id.startsWith("opt-"))?.content ?? "",
        embed: null,
        created_at: new Date(Date.now() - 1).toISOString(),
      };
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        thread_id: threadId,
        role: "assistant",
        content: data.reply,
        embed: data.embed ?? null,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<ChatMessage[]>(key, [...withoutOpt, userMsg, aiMsg]);
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.threadId) {
        qc.setQueryData(qk.chatMessages(ctx.threadId), ctx.prev);
      }
    },
  });
}
