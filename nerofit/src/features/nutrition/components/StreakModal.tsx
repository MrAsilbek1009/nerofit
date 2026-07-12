import { Modal, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react-native";
import { Button } from "@/components/ui";
import type { WeekDot } from "@/lib/nutrition/insights";
import { colors, fonts, radii, space, typography } from "@/theme";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * Streak celebration (Cal AI reference, docs/cal-ai-flow-study.md §2) —
 * shown once per day after the first log. Chartreuse is allowed here by the
 * pillar plan ("gamification INTIZOM bilan"): the flame + filled day dots
 * count as progress marks; everything else stays white/gray.
 */
export function StreakModal({
  visible,
  streak,
  dots,
  onClose,
}: {
  visible: boolean;
  streak: number;
  dots: WeekDot[];
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.close")}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          alignItems: "center",
          justifyContent: "center",
          padding: space[5],
        }}
      >
        {/* Card itself swallows taps so only the backdrop dismisses. */}
        <Pressable
          onPress={() => undefined}
          style={{
            width: "100%",
            backgroundColor: colors.elevated,
            borderRadius: radii.md,
            padding: space[6],
            alignItems: "center",
            gap: space[4],
          }}
        >
          <Flame size={40} color={colors.accent} fill={colors.accent} />
          <View style={{ alignItems: "center", gap: space[1] }}>
            <Text style={{ fontFamily: fonts.display, color: colors.textHi, fontSize: 56 }}>
              {streak}
            </Text>
            <Text style={typography.labelCaps}>{t("nutrition.streak.days")}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: space[3] }}>
            {dots.map((d) => (
              <View key={d.day} style={{ alignItems: "center", gap: space[1] }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: d.logged ? colors.accent : "transparent",
                    borderWidth: d.logged ? 0 : 1,
                    borderColor: d.isToday ? colors.textHi : colors.border,
                  }}
                />
                <Text style={[typography.labelCaps, { fontSize: 9 }]}>
                  {t(`progress.days.${DAY_KEYS[d.dayIndex]}`).charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          <Text style={[typography.bodyMuted, { textAlign: "center" }]}>
            {t("nutrition.streak.body")}
          </Text>

          <View style={{ alignSelf: "stretch" }}>
            <Button label={t("nutrition.streak.continue")} onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
