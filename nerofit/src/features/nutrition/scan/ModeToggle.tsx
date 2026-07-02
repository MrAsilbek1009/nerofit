import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, fonts, radii, space } from "@/theme";

export type ScanMode = "photo" | "barcode" | "search";

const MODES: ScanMode[] = ["photo", "barcode", "search"];

// Segmented control that switches the food-scan input method. The selected
// segment is the one chartreuse accent on this surface (accent discipline).
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: ScanMode;
  onChange: (m: ScanMode) => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.elevated,
        borderRadius: radii.pill,
        padding: 3,
      }}
    >
      {MODES.map((m) => {
        const selected = m === mode;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t(`nutrition.scan.modes.${m}`)}
            style={{
              paddingHorizontal: space[4],
              paddingVertical: space[2],
              borderRadius: radii.pill,
              backgroundColor: selected ? colors.accent : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.label,
                fontSize: 12,
                letterSpacing: 0.4,
                color: selected ? colors.canvas : colors.textHi,
              }}
            >
              {t(`nutrition.scan.modes.${m}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
