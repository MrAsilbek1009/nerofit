import { useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { ArrowUp, Mic } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { noWebOutline } from "@/lib/style";
import { colors, fonts, radii, space } from "@/theme";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
};

export function ChatInput({ value, onChange, onSend, sending }: Props) {
  const { t } = useTranslation();
  const ref = useRef<TextInput>(null);
  const canSend = value.trim().length > 0 && !sending;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: space[3],
        paddingHorizontal: space[5],
        paddingVertical: space[3],
        backgroundColor: colors.canvas,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: radii.pill,
          paddingHorizontal: space[4],
          paddingVertical: space[3] - 2,
          gap: space[2],
          minHeight: 44,
        }}
      >
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChange}
          placeholder={t("coach.inputPlaceholder")}
          placeholderTextColor={colors.textLo}
          multiline
          style={[
            {
              flex: 1,
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.textHi,
              maxHeight: 120,
            },
            noWebOutline,
          ]}
          onSubmitEditing={canSend ? onSend : undefined}
        />
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {/* mic – Phase 6 */}}
        >
          <Mic size={18} color={colors.textLo} />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={canSend ? onSend : undefined}
        style={{
          width: 44,
          height: 44,
          borderRadius: radii.pill,
          backgroundColor: canSend ? colors.accent : colors.elevated,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.canvas} />
        ) : (
          <ArrowUp size={20} color={canSend ? colors.canvas : colors.textLo} />
        )}
      </Pressable>
    </View>
  );
}
