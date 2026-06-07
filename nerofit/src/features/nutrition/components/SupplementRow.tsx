import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Supplement } from "@/types/db";
import { colors, fonts, space, typography } from "@/theme";

export function SupplementRow({
  supplement,
  taken,
  onToggle,
}: {
  supplement: Supplement;
  taken: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const meta = [
    supplement.default_dose,
    t(`nutrition.dayPart.${supplement.time_of_day}`).toUpperCase(),
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ checked: taken }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: space[3],
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 16 }}>
          {supplement.name}
        </Text>
        <Text style={[typography.labelCaps, { fontSize: 10 }]}>{meta}</Text>
      </View>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 1.5,
          borderColor: taken ? colors.accent : colors.border,
          backgroundColor: "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {taken ? <Check size={15} color={colors.accent} /> : null}
      </View>
    </Pressable>
  );
}
