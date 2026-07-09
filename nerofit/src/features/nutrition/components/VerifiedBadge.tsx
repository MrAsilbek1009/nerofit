import { Text, View } from "react-native";
import { BadgeCheck } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { colors, typography } from "@/theme";

// Chartreuse "Verified" mark for foods reviewed by moderation (accent discipline:
// verified status is an allowed accent use). `compact` shows just the check.
export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <BadgeCheck size={14} color={colors.accent} />
      {compact ? null : (
        <Text style={[typography.labelCaps, { color: colors.accent, fontSize: 10 }]}>
          {t("nutrition.foods.verified")}
        </Text>
      )}
    </View>
  );
}
