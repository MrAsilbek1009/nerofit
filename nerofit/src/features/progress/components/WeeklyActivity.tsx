import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { startOfWeek, toLocalDayKey } from "@/features/progress/streak";
import { colors, fonts, space, typography } from "@/theme";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function WeeklyActivity({ sessionDates }: { sessionDates: string[] }) {
  const { t } = useTranslation();
  const active = new Set(sessionDates.map(toLocalDayKey));
  const todayKey = toLocalDayKey(new Date());
  const weekStart = startOfWeek();

  const days = DAY_KEYS.map((label, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = toLocalDayKey(d);
    return {
      label: t(`progress.days.${label}`),
      date: d.getDate(),
      done: active.has(key),
      isToday: key === todayKey,
      isFuture: d.getTime() > new Date().setHours(23, 59, 59, 999),
    };
  });

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {days.map((day, i) => (
        <View key={i} style={{ alignItems: "center", gap: space[2] }}>
          <Text style={[typography.labelCaps, { fontSize: 10 }]}>{day.label}</Text>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: day.done ? colors.accent : "transparent",
              borderWidth: day.done ? 0 : day.isToday ? 1.5 : 0,
              borderColor: colors.textHi,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyMed,
                fontSize: 13,
                color: day.done
                  ? colors.canvas
                  : day.isFuture
                    ? colors.textLo
                    : colors.textHi,
              }}
            >
              {day.date}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
