import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, fonts, radii, space } from "@/theme";

const SUGGESTIONS_KEYS = [
  "coach.suggestions.adjustPlan",
  "coach.suggestions.howAmIDoing",
  "coach.suggestions.mealIdeas",
  "coach.suggestions.recoveryTips",
] as const;

type Props = {
  onSelect: (text: string) => void;
};

export function SuggestionChips({ onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: space[2], paddingHorizontal: space[5] }}
    >
      {SUGGESTIONS_KEYS.map((key) => {
        const label = t(key);
        return (
          <TouchableOpacity
            key={key}
            activeOpacity={0.7}
            onPress={() => onSelect(label)}
            style={{
              paddingHorizontal: space[4],
              paddingVertical: space[2],
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.label,
                fontSize: 13,
                color: colors.textHi,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
