import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ChatBubble, TypingBubble } from "@/features/coach/components/ChatBubble";
import { ChatInput } from "@/features/coach/components/ChatInput";
import { SuggestionChips } from "@/features/coach/components/SuggestionChips";
import { useUserId } from "@/hooks/useUser";
import { useChatMessages, useSendMessage, useThread } from "@/lib/queries/chat";
import type { ChatMessage } from "@/types/db";
import { colors, fonts, space, typography } from "@/theme";

export default function CoachScreen() {
  const { t } = useTranslation();
  const userId = useUserId();
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const threadQuery = useThread(userId);
  const threadId = threadQuery.data ?? null;
  const messagesQuery = useChatMessages(threadId);
  const sendMutation = useSendMessage();

  const messages = messagesQuery.data ?? [];
  const isEmpty = messages.length === 0;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  function handleSend() {
    const text = input.trim();
    if (!text || !threadId || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate({ threadId, message: text });
  }

  function handleSuggestion(text: string) {
    setInput(text);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: space[4],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 16,
              color: colors.accent,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {t("coach.title")}
          </Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{
            padding: space[5],
            gap: space[5],
            flexGrow: 1,
            justifyContent: isEmpty ? "flex-end" : undefined,
          }}
          renderItem={({ item }) => (
            <ChatBubble
              role={item.role}
              content={item.content}
              embed={item.embed}
            />
          )}
          ListEmptyComponent={
            !messagesQuery.isLoading ? (
              <View style={{ gap: space[2], paddingBottom: space[4] }}>
                <Text
                  style={[
                    typography.display,
                    { fontSize: 28, textTransform: "uppercase" },
                  ]}
                >
                  {t("coach.emptyTitle")}
                </Text>
                <Text style={typography.bodyMuted}>{t("coach.emptySubtitle")}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={sendMutation.isPending ? <TypingBubble /> : null}
          onContentSizeChange={scrollToBottom}
        />

        {/* Error */}
        {sendMutation.isError ? (
          <View style={{ paddingHorizontal: space[5], paddingBottom: space[2] }}>
            <Text style={[typography.bodyMuted, { color: "#FF6B6B", fontSize: 12 }]}>
              {t("coach.sendError")}
            </Text>
          </View>
        ) : null}

        {/* Suggestion chips (shown when chat is empty) */}
        {isEmpty && !sendMutation.isPending ? (
          <View style={{ paddingBottom: space[3] }}>
            <SuggestionChips onSelect={handleSuggestion} />
          </View>
        ) : null}

        {/* Input */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          sending={sendMutation.isPending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
