import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Flame, Utensils } from "lucide-react-native";
import { colors, fonts, radii, space, typography } from "@/theme";
import type { MealLog } from "@/types/db";

function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// The most recently logged meal — thumbnail, name, time, calories, macro chips.
export function RecentMeal({ log, onPress }: { log: MealLog; onPress?: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[3],
        backgroundColor: colors.elevated,
        borderRadius: radii.md,
        padding: space[3],
      }}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: radii.sm,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Utensils size={22} color={colors.textLo} />
      </View>

      <View style={{ flex: 1, gap: space[1] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text
            style={{ fontFamily: fonts.bodyMed, color: colors.textHi, fontSize: 15, flex: 1 }}
            numberOfLines={1}
          >
            {log.name ?? t("nutrition.meals")}
          </Text>
          <Text style={[typography.bodyMuted, { fontSize: 11 }]}>{formatTime(log.logged_at)}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: space[1] }}>
          <Flame size={14} color={colors.streak} />
          <Text style={{ fontFamily: fonts.label, color: colors.textHi, fontSize: 13 }}>
            {log.kcal ?? 0} {t("nutrition.kcal")}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: space[3] }}>
          <MacroChip color={colors.protein} value={log.protein_g} unit={t("nutrition.g")} />
          <MacroChip color={colors.carbs} value={log.carbs_g} unit={t("nutrition.g")} />
          <MacroChip color={colors.fats} value={log.fats_g} unit={t("nutrition.g")} />
        </View>
      </View>
    </Pressable>
  );
}

function MacroChip({
  color,
  value,
  unit,
}: {
  color: string;
  value: number | null;
  unit: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[1] }}>
      <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: color }} />
      <Text style={[typography.bodyMuted, { fontSize: 12 }]}>
        {value ?? 0}
        {unit}
      </Text>
    </View>
  );
}
