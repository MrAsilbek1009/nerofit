import { Text, View } from "react-native";
import { Bot } from "lucide-react-native";
import { WorkoutEmbed } from "./WorkoutEmbed";
import type { ChatEmbed } from "@/types/db";
import { colors, fonts, radii, space, typography } from "@/theme";

type Props = {
  role: "user" | "assistant";
  content: string;
  embed?: ChatEmbed | null;
};

export function ChatBubble({ role, content, embed }: Props) {
  if (role === "user") {
    return (
      <View style={{ alignItems: "flex-end", paddingLeft: space[7] }}>
        <View
          style={{
            backgroundColor: colors.elevated,
            borderRadius: radii.md,
            borderBottomRightRadius: 4,
            paddingHorizontal: space[4],
            paddingVertical: space[3],
          }}
        >
          <Text style={typography.body}>{content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap: space[3], paddingRight: space[7] }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radii.pill,
          backgroundColor: colors.elevated,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        <Bot size={16} color={colors.accent} />
      </View>

      <View style={{ flex: 1, gap: space[3] }}>
        <Text style={[typography.body, { lineHeight: 22 }]}>{content}</Text>
        {embed?.type === "workout" && <WorkoutEmbed embed={embed} />}
      </View>
    </View>
  );
}

export function TypingBubble() {
  return (
    <View style={{ flexDirection: "row", gap: space[3] }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radii.pill,
          backgroundColor: colors.elevated,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Bot size={16} color={colors.accent} />
      </View>
      <View style={{ justifyContent: "center" }}>
        <Text style={{ fontFamily: fonts.body, color: colors.textLo, fontSize: 14 }}>
          Forge is thinking…
        </Text>
      </View>
    </View>
  );
}
