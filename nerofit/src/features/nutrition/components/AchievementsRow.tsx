import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  CalendarCheck,
  Camera,
  Flame,
  ListChecks,
  Trophy,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native";
import type { BadgeId, BadgeState } from "@/lib/nutrition/badges";
import { colors, radii, space, typography } from "@/theme";

const ICONS: Record<BadgeId, LucideIcon> = {
  streak7: Flame,
  streak30: Trophy,
  logs100: ListChecks,
  scans10: Camera,
  foodAdded: UtensilsCrossed,
  weekPerfect: CalendarCheck,
};

/**
 * Derived nutrition badges on the Profile (Phase 16 N4.1) — few and quiet per
 * the pillar plan. Achieved = chartreuse icon (gamification allowance);
 * locked = gray with a progress caption. Renders nothing while loading or on
 * error: badges are decoration, never a blocker.
 */
export function AchievementsRow({ badges }: { badges: BadgeState[] }) {
  const { t } = useTranslation();
  if (badges.length === 0) return null;

  return (
    <View style={{ gap: space[3] }}>
      <Text style={typography.labelCaps}>{t("nutrition.badges.title")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[3] }}>
        {badges.map((b) => {
          const Icon = ICONS[b.id];
          return (
            <View
              key={b.id}
              accessibilityLabel={`${t(`nutrition.badges.names.${b.id}`)} — ${
                b.achieved
                  ? t("nutrition.badges.achievedA11y")
                  : t("nutrition.badges.progress", { current: b.current, target: b.target })
              }`}
              style={{
                width: "30%",
                flexGrow: 1,
                alignItems: "center",
                gap: space[2],
                paddingVertical: space[3],
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.md,
                opacity: b.achieved ? 1 : 0.75,
              }}
            >
              <Icon
                size={22}
                color={b.achieved ? colors.accent : colors.textLo}
                fill={b.achieved && b.id === "streak7" ? colors.accent : "transparent"}
              />
              <Text
                style={[typography.labelCaps, { fontSize: 9, textAlign: "center" }]}
                numberOfLines={1}
              >
                {t(`nutrition.badges.names.${b.id}`)}
              </Text>
              <Text
                style={[
                  typography.labelCaps,
                  { fontSize: 9, color: b.achieved ? colors.textHi : colors.textLo },
                ]}
              >
                {b.achieved
                  ? t("nutrition.badges.achieved")
                  : t("nutrition.badges.progress", { current: b.current, target: b.target })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
